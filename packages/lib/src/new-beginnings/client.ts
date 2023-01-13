import { type ClientServerConnection } from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { applyEvent, ShoppingList, validateEvent } from "./shopping-list";

// TODO: Test this
function compare(oldList: ShoppingListItem[], newList: ShoppingListItem[]) {
  const events: ShoppingListEvent[] = [];

  newList.forEach((newItem) => {
    const oldItem = oldList.find((oldItem) => oldItem.id === newItem.id);
    if (!oldItem) {
      events.push({
        name: "ADD_ITEM",
        data: { id: newItem.id, name: newItem.name },
      });
      if (newItem.checked)
        events.push({
          name: "SET_ITEM_CHECKED",
          data: { id: newItem.id, checked: true },
        });
    } else {
      if (newItem.checked !== oldItem.checked)
        events.push({
          name: "SET_ITEM_CHECKED",
          data: { id: newItem.id, checked: newItem.checked },
        });
      if (newItem.name !== oldItem.name)
        events.push({
          name: "RENAME_ITEM",
          data: { id: newItem.id, newName: newItem.name },
        });
    }
  });

  oldList.forEach((oldItem) => {
    const newItem = newList.find(({ id }) => id === oldItem.id);
    if (!newItem)
      events.push({ name: "DELETE_ITEM", data: { id: oldItem.id } });
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
  #promise: Promise<any> | null = null;

  constructor(private $d: ClientDeps) {}

  async connect() {
    if (this.$d.serverConnection.isConnected) return;

    await this.$d.serverConnection.connect((newList) =>
      this.onRemoteListChanged(newList),
    );
    await this.flushEvents();
  }

  async flushEvents() {
    this.#promise ??= this.#flushEvents().then(() => (this.#promise = null));
    await this.#promise;
  }

  async #flushEvents() {
    if (this.$d.serverConnection.isConnected)
      await this.$d.eventQueue.process(async (events) => {
        await this.$d.serverConnection.pushEvents(events);
      });
  }

  async applyEvent(event: ShoppingListEvent) {
    if (!validateEvent(this.$d.shoppingList.items, event)) return;

    // * Apply event to local and remote shoppingList
    this.$d.shoppingList.applyEvent(event);
    this.$d.remoteShoppingListCopy.applyEvent(event);

    // * Queue event for remote push
    this.$d.eventQueue.push(event);

    // * Flush if we are connected
    await this.flushEvents();
  }

  onRemoteListChanged(newList: ShoppingListItem[]) {
    // If we have unsent events in the queue, apply them to the
    // incoming list or our local changes will be overridden.
    //
    // TODO: Could we get a timing diff here, where the events
    // are sent but not processed by the server yet? 🤔
    if (!this.$d.eventQueue.isEmpty())
      this.$d.eventQueue
        .getQueue()
        .forEach((event) => applyEvent(newList, event));

    // * Diff remote list against last version to get events
    const diffedEvents = compare(this.$d.remoteShoppingListCopy.items, newList);
    // console.log(
    //   `[CLIENT:${this.$d.serverConnection.clientId}] onRemoteListChanged - diffed events (${diffedEvents.length})`,
    //   {
    //     remoteShoppingListCopy: this.$d.remoteShoppingListCopy.items,
    //     newList,
    //     diffedEvents: JSON.stringify(diffedEvents),
    //   },
    // );

    if (diffedEvents.length > 0) {
      // * Apply events to local and replace remote shoppingList
      this.$d.shoppingList.applyEvents(diffedEvents);
      this.$d.remoteShoppingListCopy.replaceList(newList);
    }
  }
}
