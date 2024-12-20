import type { ShoppingListEvent, ShoppingListItem, UpdateMessage } from "./schemas"
import type { Server } from "./server"

export interface ClientServerConnectionDeps {
	server: Server
}

export type OnListUpdateCallback = (payload: UpdateMessage) => void

export interface ClientServerConnection {
	clientId: string | null
	isConnected: boolean
	onListUpdate: OnListUpdateCallback | null
	connect(): Promise<void>
	disconnect(): void
	pushEvents(events: ShoppingListEvent[]): Promise<ShoppingListItem[]>
}
