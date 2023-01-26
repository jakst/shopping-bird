import {
  BackendClient,
  eventListSchema,
  EventQueue,
  Server,
  ShoppingList,
  shoppingListItemSchema,
} from "hello-bird-lib";
import { z } from "zod";
import { createBot } from "./bot/bot";
import { createCached } from "./create-cached";

export async function createShoppingBird() {
  const [
    bot,
    initialBackendClientQueue,
    initialBackendClientStore,
    initialServerShoppingList,
  ] = await Promise.all([
    createBot(),
    backendClientQueueCache.get(),
    backendClientStoreCache.get(),
    serverShoppingListCache.get(),
  ]);

  const eventQueue = new EventQueue(
    initialBackendClientQueue,
    (queue) => void backendClientQueueCache.set(queue),
  );

  const backendClient = new BackendClient({
    bot,
    eventQueue,
    initialStore: initialBackendClientStore,
    onStoreChanged(store) {
      backendClientStoreCache.set(store);
    },
  });

  const shoppingList = new ShoppingList(
    initialServerShoppingList,
    (v) => void serverShoppingListCache.set(v),
  );

  return new Server({
    backendClient,
    shoppingList,
  });
}

const backendClientQueueCache = createCached(
  "backend-client-queue",
  // Array of event arrays... 😐
  z.array(eventListSchema),
);

const backendClientStoreCache = createCached(
  "backend-client-store",
  z.array(shoppingListItemSchema),
);

const serverShoppingListCache = createCached(
  "backend-client-store",
  z.array(shoppingListItemSchema),
);
