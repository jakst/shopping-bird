import test from "node:test";
import { Client, ClientServerConnection } from "./client";
import { ShoppingList } from "./lib";
import { Server, ServerClientConnection } from "./server";
import { ShoppinglistEvent, ShoppingListItem } from "./types";

interface FakeClientServerConnectionDeps {
  server: Server;
}

class FakeClientServerConnection
  implements ClientServerConnection, ServerClientConnection
{
  clientId: string | null = null;
  client: Client | null = null;

  constructor(private $d: FakeClientServerConnectionDeps) {}

  // Called from server
  assignClientId(id: string) {
    this.clientId = id;
  }

  // Called from server
  notifyListChanged(items: ShoppingListItem[]) {
    if (this.client) this.client.onRemoteListChanged(items);
    else throw new Error("No client set");
  }

  // Called from client
  connect(client: Client) {
    this.clientId = this.$d.server.connectClient(this);
  }

  // Called from client
  disconnect() {
    if (this.clientId) {
      this.$d.server.disconnectClient(this.clientId);
      this.clientId = null;
    } else {
      console.warn("Attempt to disconnect while not connected");
    }
  }

  // Called from client
  pushEvents(events: ShoppinglistEvent[]) {
    if (this.clientId) this.$d.server.pushEvents(this.clientId, events);
    else throw new Error("Not connected to server");
  }
}

test("", () => {
  const server = new Server({
    shoppingList: new ShoppingList([]),
  });

  const serverConnection = new FakeClientServerConnection({ server });

  const client1 = new Client({
    shoppingList: new ShoppingList([]),
    serverConnection,
  });
});
