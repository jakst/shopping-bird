import { expect, test, vi } from "vitest";
import { BackendClient } from "./BackendClient";
import { EventQueue } from "./event-queue";
import { ShoppingListEvent, ShoppingListItem } from "./newSchemas";
import { MockBackendBot } from "./test-utils/MockBackendBot";
import { pause } from "./test-utils/pause";

test("Only calls bot once per incoming event [regression test]", async () => {
  const backendClient = new BackendClient({
    eventQueue: new EventQueue<ShoppingListEvent[]>([], () => {}),
    initialList: [],
    onListChanged: () => {},
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

type Item = Omit<ShoppingListItem, "id">;

function createBackendClient() {
  const shoppingList: Item[] = [];
  const eventQueue = new EventQueue<ShoppingListEvent[]>([], () => {});
  const bot = new MockBackendBot(shoppingList);
  const backendClient = new BackendClient({
    eventQueue,
    initialList: [],
    onListChanged: () => {},
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
  [[[{ name: "CLEAR_CHECKED_ITEMS" }]], []],

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
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "CLEAR_CHECKED_ITEMS" }],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }],
      [{ name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } }],
      [{ name: "CLEAR_CHECKED_ITEMS" }],
    ],
    [],
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
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "CLEAR_CHECKED_ITEMS" },
      ],
    ],
    [{ name: "Ost", checked: false }],
  ],
  [
    [
      [
        { name: "ADD_ITEM", data: { id: "123", name: "Ost" } },
        { name: "SET_ITEM_CHECKED", data: { id: "123", checked: true } },
        { name: "CLEAR_CHECKED_ITEMS" },
      ],
    ],
    [],
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
