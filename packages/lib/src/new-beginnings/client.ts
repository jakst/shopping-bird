import { ClientServerConnection } from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { ShoppingList } from "./shopping-list";
import { ShoppinglistEvent, ShoppingListItem } from "./types";

function compare(oldList: ShoppingListItem[], newList: ShoppingListItem[]) {
  const events: ShoppinglistEvent[] = [];

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
  initialEventQueue: ShoppinglistEvent[];
  onEventQueueChanged: (events: ShoppinglistEvent[]) => void;
}

export class Client {
  eventQueue: EventQueue;

  constructor(private $d: ClientDeps) {
    this.eventQueue = new EventQueue(
      $d.initialEventQueue,
      $d.onEventQueueChanged,
    );
  }

  async connect() {
    await this.$d.serverConnection.connect(this);
    await this.flushEvents();
  }

  disconnect() {
    this.$d.serverConnection.disconnect();
  }

  async flushEvents() {
    await this.eventQueue.process(async (events) => {
      await this.$d.serverConnection.pushEvents(events);
    });
  }

  async applyEvent(event: ShoppinglistEvent) {
    // * Apply event to local and remote shoppingList
    this.$d.shoppingList.applyEvents([event]);
    this.$d.remoteShoppingListCopy.applyEvents([event]);

    // * Queue event for remote push
    this.eventQueue.push(event);

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
