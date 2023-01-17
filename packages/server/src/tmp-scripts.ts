import {
  BackendClient,
  EventQueue,
  Server,
  ShoppingList,
} from "hello-bird-lib";
import { backendClientQueueCache } from "./backend-client-queue";
import { backendClientStoreCache } from "./backend-client-store";
import { createBot } from "./bot/bot2";
import { cache } from "./cache";
import { serverShoppingListCache } from "./server-shopping-list";

async function run() {
  await cache.connect();

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

  console.log({
    initialBackendClientQueue,
    initialBackendClientStore,
    initialServerShoppingList,
  });

  const eventQueue = new EventQueue(
    initialBackendClientQueue,
    (queue) => void backendClientQueueCache.set(queue),
  );

  const backendClient = new BackendClient({
    bot,
    eventQueue,
    initialStore: initialBackendClientStore,
    onStoreChanged(store) {
      console.log("NEW STORe:", store);
      backendClientStoreCache.set(store);
    },
  });

  const shoppingList = new ShoppingList(initialServerShoppingList, (v) => {
    console.log("SHOPPING LIST CHANGED", v);
    return void serverShoppingListCache.set(v);
  });

  const server = new Server({
    backendClient,
    shoppingList,
  });

  const oldreturn = backendClient.onEventsReturned;
  backendClient.onEventsReturned = (events) => {
    oldreturn?.(events);
    console.log("ON EVENTS RETURNED:", events);
  };

  await server.refreshDataFromBackendClient();

  server.pushEvents(
    [
      { name: "ADD_ITEM", data: { id: "123", name: "TMP" } },
      { name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } },
    ],
    "derp",
  );

  // client.pushEvents([{ name: "DELETE_ITEM", data: { id: "123" } }]);

  // const list = await bot.getList();
  // console.log(list);
}

run();
