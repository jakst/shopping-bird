import { describe, expect, test } from "vitest";
import { setupTest } from "./test-utils/test-setup";

test("Applies events locally when not connected", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c2.client.connect();

  await c1.client.addItem("Ost");

  expect(c1.shoppingList.items).toEqual([
    expect.objectContaining({ name: "Ost", checked: false }),
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(setup.serverShoppingList.items).toEqual([]);
});

test("Syncs events to server and other clients when connected", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c2.client.connect();

  await c1.client.addItem("Ost");

  expect(c1.shoppingList.items).toEqual([
    expect.objectContaining({ name: "Ost", checked: false }),
  ]);
  expect(c2.shoppingList.items).toEqual([]);
  expect(setup.serverShoppingList.items).toEqual([]);

  await c1.client.connect();

  expect(c1.shoppingList.items).toEqual([
    expect.objectContaining({ name: "Ost", checked: false }),
  ]);
  expect(c1.shoppingList.items).toEqual(c2.shoppingList.items);
  expect(c1.shoppingList.items).toEqual(setup.serverShoppingList.items);
});

test("Syncs events immediately for connected clients", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.addItem("Ost");

  expect(c1.shoppingList.items).toEqual([
    expect.objectContaining({ name: "Ost", checked: false }),
  ]);
  expect(c1.shoppingList.items).toEqual(setup.serverShoppingList.items);
});

test("Handles events from multiple clients", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await Promise.all([c1.client.connect(), c2.client.connect()]);

  await c1.client.addItem("Ost");
  await c2.client.addItem("Skinka");

  await setup.playOutListSync();
  expect(c1.shoppingList.items).toEqual([
    expect.objectContaining({ name: "Ost", checked: false }),
    expect.objectContaining({ name: "Skinka", checked: false }),
  ]);
  setup.assertEqualLists();
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

test("Attempting to add two items with the same name", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();

  await c1.client.connect();

  await c1.client.addItem("Ost");
  await c1.client.addItem("Ost");

  await setup.playOutListSync();
  setup.assertEqualLists();
  // TODO: Expect both, or one to be added?
});

test("Rename an item before syncing the creation event", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c1.client.connect();

  const itemId1 = await c2.client.addItem("Gammal ost");
  await c2.client.renameItem(itemId1, "Ny ost");

  await setup.playOutListSync();
  setup.assertEqualLists();
});

test("Rename an item before syncing the creation event, with changes on the external list", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();

  const itemId1 = await c1.client.addItem("Gammal ost");
  await c1.client.renameItem(itemId1, "Ny ost");

  setup.externalList.push({ name: "Gröt", checked: false });

  await setup.playOutListSync();
  setup.assertEqualLists();
});

test("Handles disconnects between applying and processing events gracefully", async () => {
  const setup = setupTest();
  const c1 = setup.createClient();

  await c1.client.connect();

  // We don't await this...
  c1.client.addItem("Mackor");

  // ... so this is queued up. It is also not awaited...
  c1.client.addItem("Smör");

  // ... so disconnect happens before processing
  c1.serverConnection.disconnect();

  // When EventQueue tries to process the event,
  // we are in disconnected state.

  await setup.playOutListSync();
  setup.assertEqualLists();
});

describe("client.clearCheckedItems()", () => {
  test("Only clears checked items", async () => {
    const setup = setupTest();
    const { client, shoppingList } = setup.createClient();

    const itemId1 = await client.addItem("Ost");
    await client.addItem("Skinka");
    await client.setItemChecked(itemId1, true);
    await client.clearCheckedItems();

    expect(shoppingList.items).toEqual([
      expect.objectContaining({ name: "Skinka", checked: false }),
    ]);
  });

  test("Clears all checked items", async () => {
    const setup = setupTest();
    const { client, shoppingList } = setup.createClient();

    const itemId1 = await client.addItem("Ost");
    const itemId2 = await client.addItem("Skinka");
    await client.setItemChecked(itemId1, true);
    await client.setItemChecked(itemId2, true);
    await client.clearCheckedItems();

    expect(shoppingList.items).toHaveLength(0);
  });

  test("Clears the same items on all clients", async () => {
    const setup = setupTest();
    const c1 = setup.createClient();

    await c1.client.connect();

    // Add and set an item as checked on the client
    const itemId = await c1.client.addItem("Ost");
    await c1.client.setItemChecked(itemId, true);

    // Ensure the external client has recieved the checked item
    await setup.externalClient.flush();

    // Add and set another item as checked on the external client
    setup.externalList.push({ name: "Kex", checked: false });
    setup.externalList[1].checked = true;

    // Clear all checked items on client
    await c1.client.clearCheckedItems();

    await setup.externalClient.flush();

    // This should only have cleared the item that was created on the client
    expect(setup.externalList).toHaveLength(1);
  });
});
