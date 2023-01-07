import { Client } from "./client";
import { type Server } from "./server";
import { ShoppinglistEvent } from "./types";

export interface ClientServerConnectionDeps {
  server: Server;
}

export interface ClientServerConnection {
  clientId: string | null; // TEMP? Only needed for logging for now. TODO: check if needed
  isConnected: boolean;
  connect(client: Client): Promise<void>;
  disconnect(): void;
  pushEvents(events: ShoppinglistEvent[]): Promise<void>;
}

export class BrowserServerConnection implements ClientServerConnection {
  clientId: string | null = null;

  get isConnected(): boolean {
    throw new Error("Method not implemented.");
  }

  connect(client: Client): Promise<void> {
    throw new Error("Method not implemented.");
  }

  disconnect(): void {
    throw new Error("Method not implemented.");
  }

  pushEvents(events: ShoppinglistEvent[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
