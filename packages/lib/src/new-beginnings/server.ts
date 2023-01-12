import { nanoid } from "nanoid";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { ShoppingList } from "./shopping-list";

export interface ServerClientConnection {
  assignClientId(id: string): void;
  notifyListChanged(items: ShoppingListItem[]): void;
}

interface BackendClientDeps {
  eventQueue: EventQueue<ShoppingListEvent>;
  eventHandlerMap: {
    [Key in ShoppingListEvent["name"]]: (
      event: ShoppingListEvent,
    ) => Promise<void>;
  };
}

export class BackendClient {
  nameIdMapping: Pick<ShoppingListItem, "id" | "name" | "checked">[] = [];

  constructor(private $d: BackendClientDeps) {
    // * TODO: Load id <=> name map from storage
  }

  doSomething(events: ShoppingListEvent[]) {
    events.forEach((event) => this.$d.eventQueue.push(event));
  }

  async getList(): Promise<Pick<ShoppingListItem, "name" | "checked">[]> {
    return [];
  }

  async handle() {
    // * Read current items
    const list = await this.getList();

    // * Generate events
    const generatedEvents: ShoppingListEvent[] = [];
    list.forEach((newItem) => {
      const itemFromBefore = this.nameIdMapping.find(
        ({ name }) => name === newItem.name,
      );

      if (!itemFromBefore) {
        const id = nanoid();
        generatedEvents.push({
          name: "ADD_ITEM",
          data: { id, name: newItem.name },
        });

        if (newItem.checked) {
          generatedEvents.push({
            name: "SET_ITEM_CHECKED",
            data: { id, checked: true },
          });
        }
      } else if (itemFromBefore.checked !== newItem.checked) {
        generatedEvents.push({
          name: "SET_ITEM_CHECKED",
          data: { id: itemFromBefore.id, checked: newItem.checked },
        });
      }
    });

    this.nameIdMapping.forEach((olditem) => {
      const currentItem = list.find(({ name }) => name === olditem.name);
      if (!currentItem)
        generatedEvents.push({ name: "DELETE_ITEM", data: { id: olditem.id } });
    });

    // * Apply events
    await this.$d.eventQueue.process(async (events) => {
      for (const event of events) {
        await this.$d.eventHandlerMap[event.name](event);
      }
    });

    // * TODO: Generate and persist new name <=> id map
    // * TODO: Return generated events
  }
}

interface ServerDeps {
  shoppingList: ShoppingList;
  backendClient?: BackendClient;
}

export class Server {
  clients = new Map<string, ServerClientConnection>();

  constructor(private $d: ServerDeps) {}

  connectClient(client: ServerClientConnection) {
    const clientId = nanoid();
    this.clients.set(clientId, client);

    console.log(
      `[SERVER] ${this.clients.size} client(s) connected (${clientId})`,
    );

    return clientId;
  }

  disconnectClient(clientId: string) {
    this.clients.delete(clientId);
  }

  pushEvents(clientId: string, events: ShoppingListEvent[]) {
    console.log(
      `[SERVER] Recieved ${events.length} event(s) from client ${clientId}`,
      events,
    );

    // Apply events
    this.$d.shoppingList.applyEvents(events);

    //
    this.$d.backendClient?.doSomething(events);

    // Notify other clients of changes to the list
    for (const [currentClientId, client] of this.clients.entries()) {
      if (clientId !== currentClientId)
        client.notifyListChanged(this.$d.shoppingList.items);
    }
  }
}
