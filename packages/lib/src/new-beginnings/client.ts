import { type ClientServerConnection } from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { ShoppingList } from "./shopping-list";

function compare(oldList: ShoppingListItem[], newList: ShoppingListItem[]) {
  const events: ShoppingListEvent[] = [];

  newList.forEach((newItem) => {
    const oldItem = oldList.find((oldItem) => oldItem.id === newItem.id);
    if (!oldItem) events.push({ name: "ADD_ITEM", data: newItem });
  });

  return events;
}

interface ClientDeps {
  shoppingList: ShoppingList;
  remoteShoppingListCopy: ShoppingList;
  serverConnection: ClientServerConnection;
  eventQueue: EventQueue<ShoppingListEvent>;
}

export class Client {
  constructor(private $d: ClientDeps) {}

  async connect() {
    await this.$d.serverConnection.connect((newList) =>
      this.onRemoteListChanged(newList),
    );
    await this.flushEvents();
  }

  async flushEvents() {
    await this.$d.eventQueue.process(async (events) => {
      await this.$d.serverConnection.pushEvents(events);
    });
  }

  async applyEvent(event: ShoppingListEvent) {
    // * Apply event to local and remote shoppingList
    this.$d.shoppingList.applyEvents([event]);
    this.$d.remoteShoppingListCopy.applyEvents([event]);

    // * Queue event for remote push
    this.$d.eventQueue.push(event);

    // * Flush if we are connected
    if (this.$d.serverConnection.isConnected) await this.flushEvents();
  }

  onRemoteListChanged(newList: ShoppingListItem[]) {
    // * Diff remote list against last version to get events
    const diffedEvents = compare(this.$d.remoteShoppingListCopy.items, newList);
    console.log(
      `[CLIENT:${this.$d.serverConnection.clientId}] onRemoteListChanged - diffed events (${diffedEvents.length})`,
      {
        remoteShoppingListCopy: this.$d.remoteShoppingListCopy.items,
        newList,
        diffedEvents: JSON.stringify(diffedEvents),
      },
    );

    if (diffedEvents.length > 0) {
      // * Apply events to local and replace remote shoppingList
      this.$d.shoppingList.applyEvents(diffedEvents);
      this.$d.remoteShoppingListCopy.replaceList(newList);
    }
  }
}
