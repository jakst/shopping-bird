import { Client } from "./client";
import { type ShoppingListEvent } from "./newSchemas";
import { type Server } from "./server";

export interface ClientServerConnectionDeps {
  server: Server;
}

export interface ClientServerConnection {
  clientId: string | null; // TEMP? Only needed for logging for now. TODO: check if needed
  isConnected: boolean;
  connect(client: Client): Promise<void>;
  disconnect(): void;
  pushEvents(events: ShoppingListEvent[]): Promise<void>;
}
