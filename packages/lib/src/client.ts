import { nanoid } from "nanoid/non-secure";
import { type ClientServerConnection } from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./schemas";
import { applyEvent, ShoppingList, validateEvent } from "./shopping-list";
import { compare } from "./utils/compare";

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

  async applyEvent(event: ShoppingListEvent, flush = true) {
    if (!validateEvent(this.$d.shoppingList.items, event)) return;

    // Apply event to local and remote shoppingList
    this.$d.shoppingList.applyEvent(event);
    this.$d.remoteShoppingListCopy.applyEvent(event);

    // Queue event for remote push
    this.$d.eventQueue.push(event);

    // Flush to server
    if (flush) await this.flushEvents();
  }

  onRemoteListChanged(newList: ShoppingListItem[]) {
    // If we have unsent events in the queue, apply them to the
    // incoming list or our local changes will be overridden.
    //
    // TODO: Could we get a timing diff here, where the events
    // are sent but not processed by the server yet? 🤔
    // ANSWER: Yes we can...
    if (!this.$d.eventQueue.isEmpty())
      this.$d.eventQueue.getQueue().forEach((event) => {
        if (validateEvent(newList, event)) applyEvent(newList, event);
      });

    // Diff remote list against last version to get events
    const diffedEvents = compare(this.$d.remoteShoppingListCopy.items, newList);

    if (diffedEvents.length > 0) {
      // Apply events to local and replace remote shoppingList
      this.$d.shoppingList.applyEvents(diffedEvents);
      this.$d.remoteShoppingListCopy.replaceList(newList);
    }
  }

  async addItem(name: string) {
    const id = nanoid();
    await this.applyEvent({ name: "ADD_ITEM", data: { id, name } });

    return id;
  }

  async deleteItem(id: string) {
    await this.applyEvent({ name: "DELETE_ITEM", data: { id } });
  }

  async setItemChecked(id: string, checked: boolean) {
    await this.applyEvent({ name: "SET_ITEM_CHECKED", data: { id, checked } });
  }

  async renameItem(id: string, newName: string) {
    await this.applyEvent({ name: "RENAME_ITEM", data: { id, newName } });
  }

  async clearCheckedItems() {
    const checkedItems = this.$d.shoppingList.items.filter(
      ({ checked }) => checked,
    );

    for (const { id } of checkedItems) {
      const event: ShoppingListEvent = { name: "DELETE_ITEM", data: { id } };
      // Skip flushing for every event
      await this.applyEvent(event, false);
    }

    // Flush here instead
    await this.flushEvents();

    return checkedItems.map(({ id }) => id);
  }
}
