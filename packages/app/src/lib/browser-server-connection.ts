import {
  Client,
  dbSchema,
  type ClientServerConnection,
  type ShoppinglistEvent,
} from "hello-bird-lib";
import { env } from "./env";

export class BrowserServerConnection implements ClientServerConnection {
  clientId: string | null = null;
  eventSource: EventSource | null = null;

  get isConnected() {
    return this.clientId !== null;
  }

  async connect(client: Client) {
    if (this.isConnected) return;

    const eventSource = new EventSource(`${env.BACKEND_URL}/sse`);
    this.eventSource = eventSource;
    eventSource.addEventListener("db-update", (event) => {
      const data = dbSchema.parse(JSON.parse(event.data));
      client.onRemoteListChanged(data);
    });

    eventSource.addEventListener("error", () => {
      this.clientId = null;
    });

    return new Promise<void>((resolve) =>
      eventSource.addEventListener("sse-id", (event: MessageEvent<string>) => {
        this.clientId = event.data;
        resolve();
      }),
    );
  }

  disconnect() {
    this.eventSource?.close();
  }

  async pushEvents(events: ShoppinglistEvent[]) {
    // await client.pushActions.mutate({ sseId: this.clientId, actions: events });
    throw new Error("Function not implemented.");
  }
}
