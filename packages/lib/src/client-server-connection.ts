import {
  ShoppingListItem,
  UpdateMessage,
  type ShoppingListEvent,
} from "./schemas";
import { type Server } from "./server";

export interface ClientServerConnectionDeps {
  server: Server;
}

export type OnListUpdateCallback = (payload: UpdateMessage) => void;

export interface ClientServerConnection {
  clientId: string | null; // TEMP? Only needed for logging for now. TODO: check if needed
  isConnected: boolean;
  connect(onListUpdate: OnListUpdateCallback): Promise<void>;
  disconnect(): void;
  pushEvents(events: ShoppingListEvent[]): Promise<ShoppingListItem[]>;
}
