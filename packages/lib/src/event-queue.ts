export class EventQueue<T> {
  #queue: T[];
  #processPromise: Promise<void> | null = null;

  constructor(
    initialQueue: T[],
    private onQueueChanged: (events: T[]) => void,
  ) {
    this.#queue = initialQueue;
  }

  isEmpty() {
    return this.#queue.length === 0;
  }

  getQueue() {
    return this.#queue;
  }

  push(event: T) {
    this.#queue.push(event);
    this.onQueueChanged(this.#queue);
  }

  async process(handleEvents: (events: T[]) => Promise<void>) {
    if (this.#queue.length < 1) return;

    // Wait for previous run to finish
    if (this.#processPromise) await this.#processPromise;

    this.#processPromise = this.#process(handleEvents);

    try {
      await this.#processPromise;
    } finally {
      this.#processPromise = null;
    }
  }

  async #process(handleEvents: (events: T[]) => Promise<void>) {
    if (this.#queue.length < 1) return;

    // Make a copy we can use for clearing processed events later
    const eventsToHandle = [...this.#queue];

    await handleEvents(eventsToHandle);

    this.#queue = this.#queue.filter(
      (event) => !eventsToHandle.includes(event),
    );

    this.onQueueChanged(this.#queue);
  }
}
