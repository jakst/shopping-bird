import { expect, test, vi } from "vitest";
import { BackendClient } from "./BackendClient";
import { EventQueue } from "./event-queue";
import { ShoppingListEvent, ShoppingListItem } from "./newSchemas";
import { ShoppingList } from "./shopping-list";
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

  backendClient.sync([{ id: "1", name: "Ost", checked: false }]);
  await pause(1);
  backendClient.sync([
    { id: "1", name: "Ost", checked: false },
    { id: "2", name: "Skinka", checked: false },
  ]);
  backendClient.sync([
    { id: "1", name: "Ost", checked: false },
    { id: "2", name: "Skinka", checked: false },
    { id: "3", name: "Bröd", checked: false },
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

  const list = [{ id: "1", name: "Skinka", checked: false }];

  backendClient.sync(list);
  await backendClient.flush();

  expect(backendClient.onEventsReturned).toHaveBeenCalledOnce();
  expect(backendClient.onEventsReturned).toHaveBeenCalledWith([
    { name: "ADD_ITEM", data: expect.objectContaining({ name: "Ost" }) },
  ]);

  mock.mockReset();

  list.push({ id: "2", name: "Kaviar", checked: false });
  backendClient.sync(list);
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
  async (eventGroups, expected) => {
    const { backendClient, shoppingList } = createBackendClient();

    const list = new ShoppingList([], () => {});
    for (const events of eventGroups) {
      list.applyEvents(events);
      backendClient.sync(list.items);
      // backendClient.pushEvents(events);
    }

    await backendClient.flush();

    expect(shoppingList).toEqual(expected);
  },
);
