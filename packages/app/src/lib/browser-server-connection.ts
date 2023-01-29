import {
  dbSchema,
  type ClientServerConnection,
  type OnRemoteListChangedCallback,
  type ShoppingListEvent,
} from "hello-bird-lib";
import { env } from "./env";

export class BrowserServerConnection implements ClientServerConnection {
  clientId: string | null = null;
  eventSource: EventSource | null = null;

  get isConnected() {
    return this.clientId !== null;
  }

  constructor(
    private onConnectionStatusChanged?: (connected: boolean) => void,
  ) {}

  async connect(onRemoteListChanged: OnRemoteListChangedCallback) {
    if (this.isConnected) return;

    const eventSource = new EventSource(`${env.BACKEND_URL}/register`);
    this.eventSource = eventSource;

    const listUpdateListener = (event: { data: string }) => {
      const data = dbSchema.parse(JSON.parse(event.data));
      onRemoteListChanged(data);
    };

    const errorListener = () => {
      this.clientId = null;
      this.onConnectionStatusChanged?.(false);
    };

    eventSource.addEventListener("list-update", listUpdateListener);
    eventSource.addEventListener("error", errorListener);

    return new Promise<void>((resolve) => {
      const listener = (event: MessageEvent<string>) => {
        this.clientId = event.data;
        this.onConnectionStatusChanged?.(true);
        resolve();
      };

      eventSource.addEventListener("client-id", listener);
    });
  }

  disconnect() {
    this.eventSource?.close();
  }

  async pushEvents(events: ShoppingListEvent[]) {
    const response = await fetch("??? TODO", {
      method: "POST",
      body: JSON.stringify({
        clientId: "", // TODO
        events,
      }),
    });

    // TODO: Handle response
  }
}
