export { Client } from "./new-beginnings/client";
export {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
  type OnRemoteListChangedCallback,
} from "./new-beginnings/client-server-connection";
export { EventQueue } from "./new-beginnings/event-queue";
export { ExternalClient, type Bot } from "./new-beginnings/external-client";
export {
  eventListSchema,
  eventSchema,
  shoppingListItemSchema,
  shoppingListSchema,
  type ShoppingListEvent,
  type ShoppingListItem,
} from "./new-beginnings/newSchemas";
export { Server } from "./new-beginnings/server";
export { ShoppingList } from "./new-beginnings/shopping-list";
export { trimAndUppercase } from "./trimAndUppercase";
