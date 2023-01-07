import { nanoid } from "nanoid";
import { ShoppingList } from "./shopping-list";
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

    console.log(
      `[SERVER] ${this.clients.size} client(s) connected (${clientId})`,
    );

    return clientId;
  }

  disconnectClient(clientId: string) {
    this.clients.delete(clientId);
  }

  pushEvents(clientId: string, events: ShoppinglistEvent[]) {
    console.log(
      `[SERVER] Recieved ${events.length} event(s) from client ${clientId}`,
      events,
    );

    // Apply events
    this.$d.shoppingList.applyEvents(events);

    // Notify other clients of changes to the list
    for (const [currentClientId, client] of this.clients.entries()) {
      if (clientId !== currentClientId)
        client.notifyListChanged(this.$d.shoppingList.items);
    }
  }
}
