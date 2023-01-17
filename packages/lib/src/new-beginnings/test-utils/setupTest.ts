import { expect } from "vitest";
import { ShoppinglistEvent } from "../../lib";
import { BackendClient } from "../BackendClient";
import { Client } from "../client";
import { EventQueue } from "../event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "../newSchemas";
import { Server } from "../server";
import { ShoppingList } from "../shopping-list";
import { FakeClientServerConnection } from "./FakeClientServerConnection";
import { MockBackendBot } from "./MockBackendBot";

export function createRandomString() {
  return (Math.random() * 100_000).toFixed();
}

export function setupTest() {
  const serverShoppingList = new ShoppingList([], (items) => {});

  const backendList: Omit<ShoppingListItem, "id">[] = [];

  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppinglistEvent[]>([], () => {}),
    initialStore: [],
    onStoreChanged: () => {},
    bot: new MockBackendBot(backendList),
  });

  const server = new Server({
    shoppingList: serverShoppingList,
    backendClient,
  });

  const clients: Client[] = [];
  const testLists: ShoppingListItem[][] = [serverShoppingList.items];
  function createClient() {
    const serverConnection = new FakeClientServerConnection({ server });

    const remoteShoppingListCopy = new ShoppingList([], (items) => {});

    const shoppingList = new ShoppingList([], (items) => {});

    testLists.push(shoppingList.items);

    const eventQueue = new EventQueue<ShoppingListEvent>([], (events) => {});

    const client = new Client({
      serverConnection,
      shoppingList,
      remoteShoppingListCopy,
      eventQueue,
    });

    clients.push(client);

    return {
      serverConnection,
      shoppingList,
      remoteShoppingListCopy,
      client,
    };
  }

  async function playOutListSync() {
    await Promise.all(clients.map((client) => client.connect()));
    await backendClient.flush();
    await server.refreshDataFromBackendClient();
  }

  function assertEqualLists() {
    const sortedLists = testLists.map((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name)),
    );

    sortedLists.forEach((list, i) => {
      if (i === sortedLists.length - 1 && backendList) {
        expect(
          backendList.sort((a, b) => a.name.localeCompare(b.name)),
        ).toEqual(list.map(({ id, ...rest }) => rest));
      } else {
        expect(list).toEqual(sortedLists[i + 1]);
      }
    });
  }

  return {
    server,
    backendClient,
    backendList,
    serverShoppingList,
    createClient,
    assertEqualLists,
    playOutListSync,
  };
}
