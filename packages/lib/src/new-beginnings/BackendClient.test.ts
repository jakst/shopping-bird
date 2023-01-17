import { expect, test, vi } from "vitest";
import { BackendClient } from "./BackendClient";
import { EventQueue } from "./event-queue";
import { ShoppingListEvent, ShoppingListItem } from "./newSchemas";
import { MockBackendBot } from "./test-utils/MockBackendBot";
import { pause } from "./test-utils/pause";

test("Only calls bot once per incoming event [regression test]", async () => {
  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppingListEvent[]>([], () => {}),
    initialStore: [],
    onStoreChanged: () => {},
    bot: new MockBackendBot([]),
  });

  const spy = vi.spyOn(backendClient["$d"].bot, "ADD_ITEM");

  backendClient.pushEvents([
    { name: "ADD_ITEM", data: { id: "1", name: "Ost" } },
  ]);
  await pause(1);
  backendClient.pushEvents([
    { name: "ADD_ITEM", data: { id: "2", name: "Skinka" } },
  ]);
  backendClient.pushEvents([
    { name: "ADD_ITEM", data: { id: "3", name: "Bröd" } },
  ]);

  await backendClient.flush();

  expect(spy).toHaveBeenCalledTimes(3);
});

test("Only generates events from items once", async () => {
  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppingListEvent[]>([], () => {}),
    initialStore: [],
    onStoreChanged: () => {},
    bot: new MockBackendBot([{ name: "Ost", checked: false }]),
  });

  const mock = (backendClient.onEventsReturned = vi.fn());

  backendClient.pushEvents([
    { name: "ADD_ITEM", data: { id: "1", name: "Skinka" } },
  ]);
  await backendClient.flush();

  expect(backendClient.onEventsReturned).toHaveBeenCalledOnce();
  expect(backendClient.onEventsReturned).toHaveBeenCalledWith([
    { name: "ADD_ITEM", data: expect.objectContaining({ name: "Ost" }) },
  ]);

  mock.mockReset();

  backendClient.pushEvents([
    { name: "ADD_ITEM", data: { id: "2", name: "Kaviar" } },
  ]);
  await backendClient.flush();

  expect(backendClient.onEventsReturned).toHaveBeenCalledTimes(0);
});

type Item = Omit<ShoppingListItem, "id">;

function createBackendClient() {
  const shoppingList: Item[] = [];
  const eventQueue = new EventQueue<ShoppingListEvent[]>([], () => {});
  const bot = new MockBackendBot(shoppingList);
  const backendClient = new BackendClient({
    eventQueue,
    initialStore: [],
    onStoreChanged: () => {},
    bot,
  });

  return { backendClient, shoppingList };
}

type TestCase = [ShoppingListEvent[][], Item[]];

const testCases: TestCase[] = [
  // Single event on empty list
  [
    [[{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }]],
    [{ name: "Ost", checked: false }],
  ],
  [[[{ name: "DELETE_ITEM", data: { id: "123" } }]], []],
  [[[{ name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } }]], []],
  [[[{ name: "RENAME_ITEM", data: { id: "123", newName: "Skinka" } }]], []],

  // Events in separate group on list with item
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "ADD_ITEM", data: { id: "123", name: "Skinka" } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "ADD_ITEM", data: { id: "456", name: "Skinka" } }],
    ],
    [
      { name: "Ost", checked: false },
      { name: "Skinka", checked: false },
    ],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "DELETE_ITEM", data: { id: "123" } }],
    ],
    [],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "DELETE_ITEM", data: { id: "456" } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } }],
    ],
    [{ name: "Ost", checked: true }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "SET_ITEM_CHECKED", data: { id: "456", checked: true } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } }],
      [{ name: "SET_ITEM_CHECKED", data: { id: "123", checked: false } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "RENAME_ITEM", data: { id: "123", newName: "Skinka" } }],
    ],
    [{ name: "Skinka", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "RENAME_ITEM", data: { id: "456", newName: "Skinka" } }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "RENAME_ITEM", data: { id: "123", newName: "Skinka" } }],
      [{ name: "RENAME_ITEM", data: { id: "123", newName: "Bröd" } }],
    ],
    [{ name: "Bröd", checked: false }],
  ],

  // Events in same group on list with item
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "ADD_ITEM", data: { id: "123", name: "Skinka" } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "ADD_ITEM", data: { id: "456", name: "Skinka" } },
      ],
    ],
    [
      { name: "Ost", checked: false },
      { name: "Skinka", checked: false },
    ],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "DELETE_ITEM", data: { id: "123" } },
      ],
    ],
    [],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "DELETE_ITEM", data: { id: "456" } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } },
      ],
    ],
    [{ name: "Ost", checked: true }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "SET_ITEM_CHECKED", data: { id: "456", checked: true } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } },
        { name: "SET_ITEM_CHECKED", data: { id: "123", checked: false } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "RENAME_ITEM", data: { id: "123", newName: "Skinka" } },
      ],
    ],
    [{ name: "Skinka", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "RENAME_ITEM", data: { id: "456", newName: "Skinka" } },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "RENAME_ITEM", data: { id: "123", newName: "Skinka" } },
        { name: "RENAME_ITEM", data: { id: "123", newName: "Bröd" } },
      ],
    ],
    [{ name: "Bröd", checked: false }],
  ],
];

test.each(testCases)(
  "\nevents\n    %j\ngenerate list ->\n    %j",
  async (evenGroups, expected) => {
    const { backendClient, shoppingList } = createBackendClient();

    for (const events of evenGroups) {
      backendClient.pushEvents(events);
    }

    await backendClient.flush();

    expect(shoppingList).toEqual(expected);
  },
);
