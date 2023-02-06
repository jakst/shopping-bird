import {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
  type OnListUpdateCallback,
} from "../client-server-connection";
import { UpdateMessage, type ShoppingListEvent } from "../schemas";
import { type ServerClientConnection } from "../server";
import { pause } from "./pause";

export class FakeClientServerConnection
  implements ClientServerConnection, ServerClientConnection
{
  clientId: string | null = null;
  onRemoteListChanged: OnListUpdateCallback | null = null;

  constructor(private $d: ClientServerConnectionDeps) {}

  get isConnected() {
    return this.clientId !== null;
  }

  // Called from server
  onListChanged(payload: UpdateMessage) {
    if (this.onRemoteListChanged)
      this.onRemoteListChanged(structuredClone(payload));
    else throw new Error("No onRemoteListChanged callback");
  }

  // Called from client
  async connect(onRemoteListChanged: OnListUpdateCallback) {
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
    if (!this.clientId) throw new Error("Not connected to server");

    const newList = this.$d.server.pushEvents(
      structuredClone(events),
      this.clientId,
    );

    return structuredClone(newList);
  }
}
