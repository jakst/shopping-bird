import { nanoid } from "nanoid";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { ShoppingList } from "./shopping-list";

export interface ServerClientConnection {
  assignClientId(id: string): void;
  notifyListChanged(items: ShoppingListItem[]): void;
}

export class BackendClient {
  #eventQueue: EventQueue<ShoppingListEvent>;

  constructor(
    initialQueue: ShoppingListEvent[],
    onQueueChanged: (events: ShoppingListEvent[]) => void,
    // TODO: Narrow down event based on Key
    private eventHandlerMap: {
      [Key in ShoppingListEvent["name"]]: (
        event: ShoppingListEvent,
      ) => Promise<void>;
    },
  ) {
    this.#eventQueue = new EventQueue(initialQueue, onQueueChanged);
  }

  doSomething(events: ShoppingListEvent[]) {
    events.forEach((event) => this.#eventQueue.push(event));
  }

  async handle() {
    // TODO: Can we really use an event queue? It processes all events in one go. A: probably
    await this.#eventQueue.process(async (events) => {
      for (const event of events) {
        await this.eventHandlerMap[event.name](event);
      }
    });
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
