import { expect, test } from "vitest";
import { setupTest } from "./test-utils/setupTest";

export function createRandomString() {
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

test("Rename an item before syncing the creation event, with changes on the backendList", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();

  await c1.client.applyEvent({
    name: "ADD_ITEM",
    data: { id: "41833", name: "Gammal ost" },
  });
  await c1.client.applyEvent({
    name: "RENAME_ITEM",
    data: { id: "41833", newName: "Ny ost" },
  });

  setup.backendList.push({ name: "Gröt", checked: false });

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
