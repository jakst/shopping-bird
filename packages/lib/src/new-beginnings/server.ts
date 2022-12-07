import { nanoid } from "nanoid";
import { ShoppingList } from "./lib";
import { ShoppinglistEvent, ShoppingListItem } from "./types";

export interface ServerClientConnection {
  assignClientId(id: string): void;
  notifyListChanged(items: ShoppingListItem[]): void;
}

interface ServerDeps {
  shoppingList: ShoppingList;
}

export class Server {
  clients = new Map<string, ServerClientConnection>();

  constructor(private $d: ServerDeps) {}

  connectClient(client: ServerClientConnection) {
    const clientId = nanoid();
    this.clients.set(clientId, client);

    return clientId;
  }

  disconnectClient(clientId: string) {
    this.clients.delete(clientId);
  }

  pushEvents(clientId: string, events: ShoppinglistEvent[]) {
    // Apply events
    this.$d.shoppingList.applyEvents(events);

    // Notify other clients of changes to the list
    for (const [currentClientId, client] of this.clients.entries()) {
      if (clientId !== currentClientId)
        client.notifyListChanged(this.$d.shoppingList.items);
    }
  }
}
