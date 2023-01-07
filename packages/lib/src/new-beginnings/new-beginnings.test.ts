import { expect, test } from "vitest";
import { ShoppinglistEvent } from "../lib";
import { BackendClient } from "./BackendClient";
import { Client } from "./client";
import {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
  type OnRemoteListChangedCallback,
} from "./client-server-connection";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { Server, type ServerClientConnection } from "./server";
import { ShoppingList } from "./shopping-list";

class FakeClientServerConnection
  implements ClientServerConnection, ServerClientConnection
{
  clientId: string | null = null;
  onRemoteListChanged: OnRemoteListChangedCallback | null = null;

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
    if (this.clientId && this.onRemoteListChanged)
      this.onRemoteListChanged(JSON.parse(JSON.stringify(items)));
    else throw new Error("No client set");
  }

  // Called from client
  async connect(onRemoteListChanged: OnRemoteListChangedCallback) {
    this.clientId = this.$d.server.connectClient(this);
    this.onRemoteListChanged = onRemoteListChanged;
  }

  // Called from client
  disconnect() {
    if (this.clientId) {
      this.$d.server.disconnectClient(this.clientId);
      this.clientId = null;
    } else {
      console.warn("Attempt to disconnect while not connected");
    }
  }

  // Called from client
  async pushEvents(events: ShoppingListEvent[]) {
    if (this.clientId)
      this.$d.server.pushEvents(
        JSON.parse(JSON.stringify(events)),
        this.clientId,
      );
    else throw new Error("Not connected to server");
  }
}

function setupTest() {
  const serverShoppingList = new ShoppingList([], (items) => {
    console.log(`[SERVER] Persisting list with ${items.length} item(s)`);
  });

  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppinglistEvent[]>([], () => {}),
    ensureFreshList: () => Promise.resolve(),
    getList: () => Promise.resolve([]),
    initialList: [],
    onListChanged: () => {},
    eventHandlerMap: {
      ADD_ITEM: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] ADD_ITEM", data);
      },
      DELETE_ITEM: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] DELETE_ITEM", data);
      },
      SET_ITEM_CHECKED: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] SET_ITEM_CHECKED", data);
      },
      RENAME_ITEM: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] RENAME_ITEM", data);
      },
      CLEAR_CHECKED_ITEMS: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[BACKEND_CLIENT] CLEAR_CHECKED_ITEMS", data);
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

test.only("Events are idempotent", async () => {
  const { serverShoppingList, backendClient, createClient } = setupTest();

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

  await backendClient.flush();

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
  // expect(backendClient).toEqual(serverShoppingList.items);
});

test.todo("Derp", async () => {
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

  await backendClient.flush();

  // expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  // expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});
