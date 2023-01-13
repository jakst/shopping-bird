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
import { MockBackendBot } from "./test-utils/MockBackendBot";
import { pause } from "./test-utils/pause";

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
    if (this.onRemoteListChanged)
      this.onRemoteListChanged(structuredClone(items));
    else throw new Error("No onRemoteListChanged callback");
  }

  // Called from client
  async connect(onRemoteListChanged: OnRemoteListChangedCallback) {
    await pause(1);
    this.onRemoteListChanged = onRemoteListChanged;
    this.clientId = this.$d.server.connectClient(this);
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
      this.$d.server.pushEvents(structuredClone(events), this.clientId);
    else throw new Error("Not connected to server");
  }
}

function setupTest() {
  const serverShoppingList = new ShoppingList([], (items) => {
    // console.log(`[SERVER] Persisting list with ${items.length} item(s)`);
  });

  const backendList: Omit<ShoppingListItem, "id">[] = [];

  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppinglistEvent[]>([], () => {}),
    initialList: [],
    onListChanged: () => {},
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

    const remoteShoppingListCopy = new ShoppingList([], (items) => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId} COPY] Persisting list with ${items.length} item(s)`,
      // );
    });

    const shoppingList = new ShoppingList([], (items) => {
      // console.log(
      //   `[CLIENT:${serverConnection.clientId}] Persisting list with ${items.length} item(s)`,
      //   items,
      // );
    });

    testLists.push(shoppingList.items);

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

function createRandomString() {
  return (Math.random() * 100_000).toFixed();
}

test("Applies events locally when not connected", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c2.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(setup.serverShoppingList.items).toEqual([]);
});

test("Syncs events to server and other clients when connected", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c2.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(setup.serverShoppingList.items).toEqual([]);

  await c1.client.connect();

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(setup.serverShoppingList.items);
});

test("Syncs events immediately for connected clients", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(setup.serverShoppingList.items);
});

test("Handles events from multiple clients", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

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
  expect(c1.shoppingList.items).toEqual(setup.serverShoppingList.items);
});

test("Events are idempotent", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();

  await c1.client.connect();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Ost" },
  });
  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Skinka" },
  });

  await setup.playOutListSync();

  expect(c1.shoppingList.items).toEqual([
    { id: "123", name: "Ost", checked: false },
  ]);
  setup.assertEqualLists();
});

test("Rename an item before syncing the creation event", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c1.client.connect();

  await c2.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "123", name: "Old name..." },
  });
  await c2.client.applyEvent({
    name: "RENAME_ITEM",
    data: { id: "123", newName: "New name!!!" },
  });

  await setup.playOutListSync();
  setup.assertEqualLists();
});

test("Handles disconnects between applying and processing events gracefully", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();

  await c1.client.connect();

  // We don't await this...
  c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "1", name: "Mackor" },
  });

  // ... so this is queued up. It is also not awaited...
  c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "2", name: "Smör" },
  });

  // ... so disconnect happens before processing
  c1.serverConnection.disconnect();

  // When EventQueue tries to process the event,
  // we will be disconnected.

  await setup.playOutListSync();
  setup.assertEqualLists();
});

const actionLog: any[] = [];
// TODO: Needs to extend to generating changes in the backend-list
test("Random", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c1.client.connect();
  await c2.client.connect();

  const eventWeights: [ShoppingListEvent["name"], number][] = [
    ["ADD_ITEM", 10],
    ["DELETE_ITEM", 3],
    ["RENAME_ITEM", 5],
    ["SET_ITEM_CHECKED", 10],
    ["CLEAR_CHECKED_ITEMS", 1],
  ];

  // const totalWeight = eventWeights.reduce((prev, curr) => prev + curr[1], 0);

  for (let i = 0; i < 100; i++) {
    for (const c of [c1, c2]) {
      const clientLog = (msg: string) =>
        actionLog.push(`[${c === c1 ? "C1" : "C2"}] ${msg}`);

      if (c.serverConnection.isConnected) {
        if (Math.random() < 0.1) {
          clientLog("disconnected");
          c.serverConnection.disconnect();
        }
      } else {
        if (Math.random() < 0.3) {
          clientLog("Started connecting");
          await c.client.connect();
          clientLog("Connected");
        }
      }

      if (Math.random() < 0.5) {
        const eventName =
          c.shoppingList.items.length > 0
            ? eventWeights[Math.floor(Math.random() * eventWeights.length)][0]
            : "ADD_ITEM";

        const randomItem =
          c.shoppingList.items[
            Math.floor(Math.random() * c.shoppingList.items.length)
          ];

        let event: ShoppingListEvent | undefined;

        switch (eventName) {
          case "ADD_ITEM": {
            event = {
              name: eventName,
              data: { id: createRandomString(), name: createRandomString() },
            };

            break;
          }

          case "DELETE_ITEM": {
            event = {
              name: eventName,
              data: { id: randomItem.id },
            };

            break;
          }

          case "RENAME_ITEM": {
            event = {
              name: eventName,
              data: { id: randomItem.id, newName: createRandomString() },
            };

            break;
          }

          case "SET_ITEM_CHECKED": {
            event = {
              name: eventName,
              data: { id: randomItem.id, checked: !randomItem.checked },
            };

            break;
          }

          case "CLEAR_CHECKED_ITEMS": {
            if (c.shoppingList.items.some(({ checked }) => checked)) {
              event = { name: eventName };
            }
            break;
          }
        }

        if (event) {
          clientLog(`event: ${JSON.stringify(event)}`);
          await c.client.applyEvent(event);
        }
      }
    }

    if (Math.random() < 0.1) {
      const numberOfActions = Math.ceil(Math.random() * 5);
    }
  }

  await setup.playOutListSync();
  setup.assertEqualLists();
});
