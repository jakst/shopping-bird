import {
  eventListSchema,
  EventQueue,
  ExternalClient,
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
    initialExternalClientQueue,
    initialExternalClientStore,
    initialServerShoppingList,
  ] = await Promise.all([
    createBot(),
    externalClientQueueCache.get(),
    externalClientStoreCache.get(),
    serverShoppingListCache.get(),
  ]);

  const eventQueue = new EventQueue(
    initialExternalClientQueue,
    (queue) => void externalClientQueueCache.set(queue),
  );

  const externalClient = new ExternalClient({
    bot,
    eventQueue,
    initialStore: initialExternalClientStore,
    onStoreChanged(store) {
      externalClientStoreCache.set(store);
    },
  });

  const shoppingList = new ShoppingList(
    initialServerShoppingList,
    (v) => void serverShoppingListCache.set(v),
  );

  return new Server({
    externalClient,
    shoppingList,
  });
}

const externalClientQueueCache = createCached(
  "external-client-queue",
  // Array of event arrays... 😐
  z.array(eventListSchema),
);

const externalClientStoreCache = createCached(
  "external-client-store",
  z.array(shoppingListItemSchema),
);

const serverShoppingListCache = createCached(
  "server-shopping-list",
  z.array(shoppingListItemSchema),
);
