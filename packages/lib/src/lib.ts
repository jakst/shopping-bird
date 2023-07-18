export { Client } from "./client"
export {
	type ClientServerConnection,
	type ClientServerConnectionDeps,
	type OnListUpdateCallback,
} from "./client-server-connection"
export { EventQueue } from "./event-queue"
export { ExternalClient, type Bot } from "./external-client"
export {
	eventListSchema,
	eventSchema,
	eventsMessageSchema,
	responseMessageSchema,
	shoppingListItemSchema,
	shoppingListSchema,
	updateMessageSchema,
	type EventsMessage,
	type ShoppingListEvent,
	type ShoppingListItem,
	type UpdateMessage,
} from "./schemas"
export { Server } from "./server"
export { ShoppingList } from "./shopping-list"
export { trimAndUppercase } from "./utils/trim-and-uppercase"
