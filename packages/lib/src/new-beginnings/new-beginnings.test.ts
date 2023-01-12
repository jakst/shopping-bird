import { expect, test } from "vitest";
import { ShoppinglistEvent } from "../lib";
import { Client } from "./client";
import {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
} from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { BackendClient, Server, type ServerClientConnection } from "./server";
import { ShoppingList } from "./shopping-list";

class FakeClientServerConnection
  implements ClientServerConnection, ServerClientConnection
{
  clientId: string | null = null;
  client: Client | null = null;

  constructor(private $d: ClientServerConnectionDeps) {}

  get isConnected() {
    return this.clientId !== null;
  }

  // Called from server
  assignClientId(id: string) {
    this.clientId = id;
  }

  // Called from server
  notifyListChanged(items: ShoppingListItem[]) {
    if (this.client)
      this.client.onRemoteListChanged(JSON.parse(JSON.stringify(items)));
    else throw new Error("No client set");
  }

  // Called from client
  async connect(client: Client) {
    this.clientId = this.$d.server.connectClient(this);
    this.client = client;
  }

  // Called from client
  disconnect() {
    if (this.clientId) {
      this.$d.server.disconnectClient(this.clientId);
      this.clientId = null;
      this.client = null;
    } else {
      console.warn("Attempt to disconnect while not connected");
    }
  }

  // Called from client
  async pushEvents(events: ShoppingListEvent[]) {
    if (this.clientId)
      this.$d.server.pushEvents(
        this.clientId,
        JSON.parse(JSON.stringify(events)),
      );
    else throw new Error("Not connected to server");
  }
}

function setupTest() {
  const serverShoppingList = new ShoppingList([], (items) => {
    console.log(`[SERVER] Persisting list with ${items.length} item(s)`);
  });

  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppinglistEvent>([], () => {}),
    eventHandlerMap: {
      ADD_ITEM: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] ADD_ITEM", event);
      },
      DELETE_ITEM: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] DELETE_ITEM", event);
      },
      SET_ITEM_CHECKED: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] SET_ITEM_CHECKED", event);
      },
      RENAME_ITEM: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] RENAME_ITEM", event);
      },
      CLEAR_CHECKED_ITEMS: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] CLEAR_CHECKED_ITEMS", event);
      },
    },
  });
  const server = new Server({
    shoppingList: serverShoppingList,
    backendClient,
  });

  function createClient() {
    const serverConnection = new FakeClientServerConnection({ server });

    const remoteShoppingListCopy = new ShoppingList([], (items) => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId} COPY] Persisting list with ${items.length} item(s)`,
      // );
    });

    const shoppingList = new ShoppingList([], (items) => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId}] Persisting list with ${items.length} item(s)`,
      // );
    });

    const eventQueue = new EventQueue<ShoppingListEvent>([], (events) => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId}] Persisting ${events.length} event(s)`,
      // );
    });

    const client = new Client({
      serverConnection,
      shoppingList,
      remoteShoppingListCopy,
      eventQueue,
    });

    return {
      serverConnection,
      shoppingList,
      remoteShoppingListCopy,
      client,
    };
  }

  return { server, backendClient, serverShoppingList, createClient };
}

test("Applies events locally when not connected", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await c2.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(serverShoppingList.items).toEqual([]);
});

test("Syncs events to server and other clients when connected", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await c2.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(serverShoppingList.items).toEqual([]);

  await c1.client.connect();

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Syncs events immediately for connected clients", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Handles events from multiple clients", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });
  await c2.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "456", name: "Skinka" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
    { id: "456", name: "Skinka", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Events are idempotent", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();

  await c1.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });
  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Skinka" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Derp", async () => {
  const { backendClient, server, serverShoppingList, createClient } =
    setupTest();

  const c1 = createClient();

  await c1.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });
  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "456", name: "Ost" },
  });

  await backendClient.handle();

  // expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  // expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});
