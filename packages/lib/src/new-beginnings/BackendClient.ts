import { nanoid } from "nanoid";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { applyEvent } from "./shopping-list";

interface BackendClientDeps {
  eventQueue: EventQueue<ShoppingListEvent[]>;
  initialStore: ShoppingListItem[];
  onStoreChanged: (store: ShoppingListItem[]) => void;
  bot: BackendClientBot;
}

export interface BackendListItem {
  name: string;
  checked: boolean;
}

export class BackendClient {
  onEventsReturned: null | ((events: ShoppingListEvent[]) => void) = null;

  /** Containst the resulting store, with mapped IDs, from the last sync */
  #previousStore: ShoppingListItem[];

  /** Contains the incoming store, that we aim to converge with */
  #incomingStore: ShoppingListItem[] | null = null;

  #promise: Promise<any> | null = null;

  constructor(private $d: BackendClientDeps) {
    this.#previousStore = $d.initialStore;
    this.#incomingStore = $d.initialStore;
  }

  async flush() {
    await this.#promiseToSync();
  }

  async sync(shoppingList: ShoppingListItem[]) {
    // Deep clone, so we don't accidentally mutate
    this.#incomingStore = structuredClone(shoppingList);
    await this.#promiseToSync();
  }

  async #promiseToSync() {
    this.#promise ??= this.#sync().then(() => (this.#promise = null));
    await this.#promise;
  }

  async #sync() {
    if (!this.#incomingStore) return;

    const workingStoreCopy = structuredClone(this.#incomingStore);
    this.#incomingStore = null;

    let actualList = await this.$d.bot.getList();
    actualList.reverse();

    const eventsToReturn = generateEvents(actualList, this.#previousStore);
    if (eventsToReturn.length > 0) {
      this.onEventsReturned?.(eventsToReturn);
      eventsToReturn.forEach((event) => applyEvent(workingStoreCopy, event));
    }

    this.$d.onStoreChanged(workingStoreCopy);

    while (!equalsList(workingStoreCopy, actualList)) {
      const mappedItems = new Set();

      for (const itan of workingStoreCopy) {
        const otherItan = actualList.find(
          (i) => i.name === itan.name && !mappedItems.has(i),
        );

        if (otherItan) {
          mappedItems.add(itan);
          mappedItems.add(otherItan);

          if (otherItan.checked !== itan.checked) {
            await this.$d.bot.SET_ITEM_CHECKED2(otherItan.index, itan.checked);
          }
        }
      }

      // Delete items that weren't mapped
      for (const otherItan of actualList.filter((i) => !mappedItems.has(i))) {
        await this.$d.bot.DELETE_ITEM2(otherItan.index);
      }

      // Add items that weren't mapped
      for (const itan of workingStoreCopy.filter((i) => !mappedItems.has(i))) {
        await this.$d.bot.ADD_ITEM(itan.name);
      }

      actualList = await this.$d.bot.getList();
      actualList.reverse();
    }

    this.#previousStore = workingStoreCopy;

    await this.#sync();
  }
}
function equalsList(
  listA: readonly { name: string; checked: boolean }[],
  listB: readonly { name: string; checked: boolean }[],
) {
  if (listA.length !== listB.length) return false;

  const sortedA = [...listA].sort((a, b) => a.name.localeCompare(b.name));
  const sortedB = [...listB].sort((a, b) => a.name.localeCompare(b.name));

  const somethingsWrong = sortedA.some((a, i) => {
    const b = sortedB[i];
    return a.name !== b.name || a.checked !== b.checked;
  });

  return !somethingsWrong;
}

function generateEvents(
  list: readonly BackendListItem[],
  previousStore: readonly ShoppingListItem[],
) {
  const generatedEvents: ShoppingListEvent[] = [];

  list.forEach((newItem) => {
    const itemFromBefore = previousStore.find(
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

  previousStore.forEach((olditem) => {
    const currentItem = list.find(({ name }) => name === olditem.name);
    if (!currentItem)
      generatedEvents.push({ name: "DELETE_ITEM", data: { id: olditem.id } });
  });

  return generatedEvents;
}

export interface BackendClientBot {
  getList(): Promise<(BackendListItem & { index: number })[]>;
  ADD_ITEM(name: string): Promise<void>;
  DELETE_ITEM(name: string): Promise<void>;
  DELETE_ITEM2(index: number): Promise<void>;
  RENAME_ITEM(oldName: string, newName: string): Promise<void>;
  SET_ITEM_CHECKED(name: string, checked: boolean): Promise<void>;
  SET_ITEM_CHECKED2(index: number, checked: boolean): Promise<void>;
}
