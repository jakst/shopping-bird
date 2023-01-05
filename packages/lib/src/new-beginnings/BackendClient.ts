import { nanoid } from "nanoid";
import { dedupeAsync } from "./dedupeAsync";
import { EventQueue } from "./event-queue";
import {
  GetShoppingListEventData,
  type ShoppingListEvent,
  type ShoppingListItem,
} from "./newSchemas";

interface BackendClientDeps {
  eventQueue: EventQueue<ShoppingListEvent[]>;
  initialList: ShoppingListItem[];
  onListChanged: (list: ShoppingListItem[]) => void;
  ensureFreshList: () => Promise<void>;
  getList: () => Promise<ListItem[]>;
  eventHandlerMap: {
    [EventName in ShoppingListEvent["name"]]: (
      eventData: GetShoppingListEventData<EventName>,
    ) => Promise<void>;
  };
}

type ListItem = Pick<ShoppingListItem, "name" | "checked">;

export class BackendClient {
  onEventsReturned: null | ((events: ShoppingListEvent[]) => void) = null;
  previousListState: ShoppingListItem[] = [];

  constructor(private $d: BackendClientDeps) {
    this.previousListState = $d.initialList;

    this.#startProcessor.bind(this);
  }

  async flush() {
    await this.#waitAndStart();
  }

  pushEvents(events: ShoppingListEvent[]) {
    this.$d.eventQueue.push(events);
    this.#waitAndStart();
  }

  #waitAndStart() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return dedupeAsync(this.#startProcessor);
  }

  async #startProcessor() {
    await this.$d.eventQueue.process(async (eventGroups) => {
      for (const events of eventGroups) {
        await this.#processEvents(events);
      }
    });

    // Process any events that arrived while running
    if (!this.$d.eventQueue.isEmpty) await this.#startProcessor();
  }

  async #processEvents(events: ShoppingListEvent[]) {
    await this.$d.ensureFreshList();

    // Generate outgoing events before we make any changes
    const listBeforeChanges = await this.$d.getList();
    const generatedEvents = generateEvents(
      listBeforeChanges,
      this.previousListState,
    );
    if (generatedEvents.length > 0) this.onEventsReturned?.(generatedEvents);

    // Apply incoming events
    for (const event of events) {
      const eventHandler = this.$d.eventHandlerMap[event.name] as (
        data: GetShoppingListEventData<typeof event.name>,
      ) => Promise<void>;

      await eventHandler(event.data);
    }

    // Read full state of list again after applied changes, without refreshing,
    // so we don't have to deal with possible bugs from replaying events.
    const listAfterChanges = await this.$d.getList();

    // Map the new state of the list with ids and notify
    this.previousListState = listAfterChanges.map((item) => {
      const id =
        this.previousListState.find(({ name }) => name === item.name)?.id ??
        generatedEvents.find(
          (event) => event.name === "ADD_ITEM" && event.data.name === item.name,
        )?.data?.id;

      if (!id) throw new Error("Missing ID. This should not be possible.");

      return { ...item, id };
    });

    this.$d.onListChanged(this.previousListState);
  }
}

function generateEvents(
  list: ListItem[],
  previousListState: ShoppingListItem[],
) {
  const generatedEvents: ShoppingListEvent[] = [];

  list.forEach((newItem) => {
    const itemFromBefore = previousListState.find(
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

  previousListState.forEach((olditem) => {
    const currentItem = list.find(({ name }) => name === olditem.name);
    if (!currentItem)
      generatedEvents.push({ name: "DELETE_ITEM", data: { id: olditem.id } });
  });

  return generatedEvents;
}
