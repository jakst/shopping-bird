import { ShoppinglistEvent } from "./types";

export class EventQueue {
  #queue: ShoppinglistEvent[];

  constructor(
    initialQueue: ShoppinglistEvent[],
    private onQueueChanged: (events: ShoppinglistEvent[]) => void,
  ) {
    this.#queue = initialQueue;
  }

  push(event: ShoppinglistEvent) {
    this.#queue.push(event);
    this.onQueueChanged(this.#queue);
  }

  async process(handleEvents: (events: ShoppinglistEvent[]) => Promise<void>) {
    if (this.#queue.length < 1) return;

    // Make a copy we can use for clearing processed events later
    const eventsToHandle = [...this.#queue];

    try {
      await handleEvents(eventsToHandle);
      this.#queue = this.#queue.filter(
        (event) => !eventsToHandle.includes(event),
      );
      this.onQueueChanged(this.#queue);

      // Any events that arrived while handler ran need to be processed as well
      if (this.#queue.length > 0) await this.process(handleEvents);
    } catch (e) {
      console.error("Failed to flush events", e);
    }
  }
}
