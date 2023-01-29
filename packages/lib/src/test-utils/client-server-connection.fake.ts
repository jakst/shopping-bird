import {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
  type OnRemoteListChangedCallback,
} from "../client-server-connection";
import { type ShoppingListEvent, type ShoppingListItem } from "../schemas";
import { type ServerClientConnection } from "../server";
import { pause } from "./pause";

export class FakeClientServerConnection
  implements ClientServerConnection, ServerClientConnection
{
  clientId: string | null = null;
  onRemoteListChanged: OnRemoteListChangedCallback | null = null;

  constructor(private $d: ClientServerConnectionDeps) {}

  get isConnected() {
    return this.clientId !== null;
  }

  // Called from server
  notifyListChanged(items: ShoppingListItem[]) {
    if (this.onRemoteListChanged)
      this.onRemoteListChanged(structuredClone(items));
    else throw new Error("No onRemoteListChanged callback");
  }

  // Called from client
  async connect(onRemoteListChanged: OnRemoteListChangedCallback) {
    await pause(1);
    this.onRemoteListChanged = onRemoteListChanged;
    this.clientId = this.$d.server.connectClient(this);
  }

  // Called from client
  disconnect() {
    if (this.clientId) {
      this.$d.server.onClientDisconnected(this.clientId);
      this.clientId = null;
    } else {
      console.warn("Attempt to disconnect while not connected");
    }
  }

  // Called from client
  async pushEvents(events: ShoppingListEvent[]) {
    if (this.clientId)
      this.$d.server.pushEvents(structuredClone(events), this.clientId);
    else throw new Error("Not connected to server");
  }
}
