import { ShoppingListItem, type ShoppingListEvent } from "./schemas";
import { type Server } from "./server";

export interface ClientServerConnectionDeps {
  server: Server;
}

export type OnRemoteListChangedCallback = (newList: ShoppingListItem[]) => void;

export interface ClientServerConnection {
  clientId: string | null; // TEMP? Only needed for logging for now. TODO: check if needed
  isConnected: boolean;
  connect(onRemoteListChanged: OnRemoteListChangedCallback): Promise<void>;
  disconnect(): void;
  pushEvents(events: ShoppingListEvent[]): Promise<void>;
}
