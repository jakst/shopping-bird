import { expect, test } from "vitest";
import { Client } from "./client";
import {
  type ClientServerConnection,
  type ClientServerConnectionDeps,
} from "./client-server-connection";
import { BackendClient, Server, type ServerClientConnection } from "./server";
import { ShoppingList } from "./shopping-list";
import { type ShoppinglistEvent, type ShoppingListItem } from "./types";

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
  async pushEvents(events: ShoppinglistEvent[]) {
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
  const backendClient = new BackendClient([], () => {}, {
    ADD_ITEM: async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("[BACKEND_CLIENT] ADD_ITEM", event);
    },
  });
  const server = new Server({
    shoppingList: serverShoppingList,
    backendClient,
  });

  function createClient() {
    const serverConnection = new FakeClientServerConnection({ server });

    const onEventQueueChanged = (events: ShoppinglistEvent[]): void => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId}] Persisting ${events.length} event(s)`,
      // );
    };

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

    const client = new Client({
      serverConnection,
      shoppingList,
      remoteShoppingListCopy,
      initialEventQueue: [],
      onEventQueueChanged,
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

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });

  expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(serverShoppingList.items).toEqual([]);
});

test("Syncs events to server and other clients when connected", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await c2.client.connect();

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });

  expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(serverShoppingList.items).toEqual([]);

  await c1.client.connect();

  expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Syncs events immediately for connected clients", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });

  expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Handles events from multiple clients", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();
  const c2 = createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });
  await c2.client.applyEvent({ name: "ADD_ITEM", data: { id: "456" } });

  expect(c1.shoppingList.items).toEqual([{ id: "123" }, { id: "456" }]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Events are idempotent", async () => {
  const { serverShoppingList, createClient } = setupTest();

  const c1 = createClient();

  await c1.client.connect();

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });
  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });

  expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});

test("Derp", async () => {
  const { backendClient, server, serverShoppingList, createClient } =
    setupTest();

  const c1 = createClient();

  await c1.client.connect();

  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "123" } });
  await c1.client.applyEvent({ name: "ADD_ITEM", data: { id: "456" } });

  await backendClient.handle();

  // expect(c1.shoppingList.items).toEqual([{ id: "123" }]);
  // expect(c1.shoppingList.items).toEqual(serverShoppingList.items);
});
