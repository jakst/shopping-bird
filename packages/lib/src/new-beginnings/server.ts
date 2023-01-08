import { nanoid } from "nanoid";
import { type BackendClient } from "./BackendClient";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { ShoppingList } from "./shopping-list";

export interface ServerClientConnection {
  assignClientId(id: string): void;
  notifyListChanged(items: ShoppingListItem[]): void;
}

interface ServerDeps {
  shoppingList: ShoppingList;
  backendClient: BackendClient;
}

export class Server {
  clients = new Map<string, ServerClientConnection>();

  constructor(private $d: ServerDeps) {
    this.$d.backendClient.onEventsReturned = (events) =>
      this.pushEvents(events);
  }

  connectClient(client: ServerClientConnection) {
    const clientId = nanoid();
    this.clients.set(clientId, client);

    console.log(
      `[SERVER] ${this.clients.size} client(s) (${clientId} connected)`,
    );

    client.notifyListChanged(this.$d.shoppingList.items);

    return clientId;
  }

  disconnectClient(clientId: string) {
    this.clients.delete(clientId);

    console.log(
      `[SERVER] ${this.clients.size} client(s) (${clientId} disconnected)`,
    );
  }

  pushEvents(events: ShoppingListEvent[], clientId?: string) {
    const successfulEvents = this.$d.shoppingList.applyEvents(events);
    console.log(
      `[SERVER] Recieved ${events.length} event(s) from client ${clientId}. ${successfulEvents.length} of them were successful.`,
    );

    if (successfulEvents.length === 0) return;

    this.$d.backendClient.pushEvents(successfulEvents);

    // Notify other clients of changes to the list
    for (const [currentClientId, client] of this.clients.entries()) {
      if (clientId !== currentClientId)
        client.notifyListChanged(this.$d.shoppingList.items);
    }
  }
}
