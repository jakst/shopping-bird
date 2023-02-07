import { expect, test, vi } from "vitest"
import { EventQueue } from "./event-queue"
import { ExternalClient } from "./external-client"
import { ShoppingListEvent, ShoppingListItem } from "./schemas"
import { ShoppingList } from "./shopping-list"
import { MockBot } from "./test-utils/bot.mock"
import { pause } from "./test-utils/pause"

test("Only calls bot once per incoming event [regression test]", async () => {
	const externalClient = new ExternalClient({
		eventQueue: new EventQueue<ShoppingListEvent[]>([], () => {}),
		initialStore: [],
		onStoreChanged: () => {},
		bot: new MockBot([]),
	})

	const spy = vi.spyOn(externalClient["$d"].bot, "ADD_ITEM")

	externalClient.sync([{ id: "1", name: "Ost", checked: false }])
	await pause(1)
	externalClient.sync([
		{ id: "1", name: "Ost", checked: false },
		{ id: "2", name: "Skinka", checked: false },
	])
	externalClient.sync([
		{ id: "1", name: "Ost", checked: false },
		{ id: "2", name: "Skinka", checked: false },
		{ id: "3", name: "Bröd", checked: false },
	])

	await externalClient.flush()

	expect(spy).toHaveBeenCalledTimes(3)
})

test("Only generates events from items once", async () => {
	const externalClient = new ExternalClient({
		eventQueue: new EventQueue<ShoppingListEvent[]>([], () => {}),
		initialStore: [],
		onStoreChanged: () => {},
		bot: new MockBot([{ name: "Ost", checked: false }]),
	})

	const mock = (externalClient.onEventsReturned = vi.fn())

	const list = [{ id: "1", name: "Skinka", checked: false }]

	externalClient.sync(list)
	await externalClient.flush()

	expect(externalClient.onEventsReturned).toHaveBeenCalledOnce()
	expect(externalClient.onEventsReturned).toHaveBeenCalledWith([
		{ name: "ADD_ITEM", data: expect.objectContaining({ name: "Ost" }) },
	])

	mock.mockReset()

	list.push({ id: "2", name: "Kaviar", checked: false })
	externalClient.sync(list)
	await externalClient.flush()

	expect(externalClient.onEventsReturned).toHaveBeenCalledTimes(0)
})

type Item = Omit<ShoppingListItem, "id">

function createExternalClient() {
	const shoppingList: Item[] = []
	const eventQueue = new EventQueue<ShoppingListEvent[]>([], () => {})
	const bot = new MockBot(shoppingList)
	const externalClient = new ExternalClient({
		eventQueue,
		initialStore: [],
		onStoreChanged: () => {},
		bot,
	})

	return { externalClient, shoppingList }
}

type TestCase = [ShoppingListEvent[][], Item[]]

const testCases: TestCase[] = [
	// Single event on empty list
	[[[{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }]], [{ name: "Ost", checked: false }]],
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
	[[[{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }], [{ name: "DELETE_ITEM", data: { id: "123" } }]], []],
	[
		[[{ name: "ADD_ITEM", data: { id: "123", name: "Ost" } }], [{ name: "DELETE_ITEM", data: { id: "456" } }]],
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
]

test.each(testCases)("\nevents\n    %j\ngenerate list ->\n    %j", async (eventGroups, expected) => {
	const { externalClient, shoppingList } = createExternalClient()

	const list = new ShoppingList([], () => {})
	for (const events of eventGroups) {
		list.applyEvents(events)
		externalClient.sync(list.items)
		// externalClient.pushEvents(events);
	}

	await externalClient.flush()

	expect(shoppingList).toEqual(expected)
})
