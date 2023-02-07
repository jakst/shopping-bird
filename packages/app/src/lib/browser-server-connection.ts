import {
  responseMessageSchema,
  updateMessageSchema,
  type ClientServerConnection,
  type OnListUpdateCallback,
  type ShoppingListEvent,
} from "shopping-bird-lib";
import { env } from "./env";

export class BrowserServerConnection implements ClientServerConnection {
  clientId: string | null = null;
  eventSource: EventSource | null = null;

  get isConnected() {
    return this.clientId !== null;
  }

  constructor(
    private onConnectionStatusChanged: (connected: boolean) => void,
  ) {}

  async connect(onListUpdate: OnListUpdateCallback) {
    if (this.isConnected) return;

    const eventSource = new EventSource(`${env.BACKEND_URL}/register`);
    this.eventSource = eventSource;

    return new Promise<void>((resolve) => {
      const listUpdateListener = (event: MessageEvent<string>) => {
        const data = updateMessageSchema.parse(JSON.parse(event.data));
        this.clientId = data.clientId;
        onListUpdate(data);

        this.onConnectionStatusChanged(true);
        resolve();
      };

      const errorListener = () => {
        this.clientId = null;
        this.onConnectionStatusChanged(false);
      };

      eventSource.addEventListener("update", listUpdateListener);
      eventSource.addEventListener("error", errorListener);
    });
  }

  disconnect() {
    this.eventSource?.close();
  }

  async pushEvents(events: ShoppingListEvent[]) {
    const response = await fetch(`${env.BACKEND_URL}/events`, {
      method: "POST",
      body: JSON.stringify({
        clientId: this.clientId,
        events,
      }),
    });

    if (response.ok) {
      const body = await response.json();
      return responseMessageSchema.parse(body).shoppingList;
    } else {
      throw new Error(`Pushing events failed: ${response}`);
    }
  }
}
