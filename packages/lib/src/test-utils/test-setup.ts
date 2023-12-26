import { expect } from "vitest"
import { Client } from "../client"
import { EventQueue } from "../event-queue"
import { ExternalClient, type ExternalListItem } from "../external-client"
import { type ShoppingListEvent } from "../lib"
import { type ShoppingListItem } from "../schemas"
import { Server } from "../server"
import { ShoppingList } from "../shopping-list"
import { MockBot } from "./bot.mock"
import { FakeClientServerConnection } from "./client-server-connection.fake"

export function createRandomString() {
	return (Math.random() * 100_000).toFixed()
}

export function setupTest() {
	const serverShoppingList = new ShoppingList([], (items) => {})

	const externalList: ExternalListItem[] = []

	const externalClient = new ExternalClient({
		initialStore: [],
		onStoreChanged: async () => {},
		bot: new MockBot(externalList),
	})

	const server = new Server(
		{
			shoppingList: serverShoppingList,
			async onSyncRequest(items) {
				await externalClient.sync(items)
			},
		},
		false,
	)

	externalClient.onEventsReturned = async (events) => {
		server.pushEvents(events)
	}

	const clients: Client[] = []
	const testLists: ShoppingListItem[][] = [serverShoppingList.items]
	function createClient() {
		const serverConnection = new FakeClientServerConnection({ server })

		const remoteShoppingListCopy = new ShoppingList([], (items) => {})

		const shoppingList = new ShoppingList([], (items) => {})

		testLists.push(shoppingList.items)

		const eventQueue = new EventQueue<ShoppingListEvent>([], (events) => {})

		const client = new Client({
			serverConnection,
			shoppingList,
			remoteShoppingListCopy,
			eventQueue,
		})

		clients.push(client)

		return {
			serverConnection,
			shoppingList,
			remoteShoppingListCopy,
			client,
		}
	}

	async function playOutListSync() {
		await Promise.all(clients.map((client) => client.connect()))
		await externalClient.flush()
		await server.refreshDataFromExternalClient()
	}

	function assertEqualLists() {
		const sortedLists = testLists.map((list) => list.sort((a, b) => a.name.localeCompare(b.name)))

		sortedLists.forEach((list, i) => {
			if (i === sortedLists.length - 1 && externalList) {
				expect(externalList.sort((a, b) => a.name.localeCompare(b.name))).toEqual(
					list.map(({ id, position, ...rest }) => rest),
				)
			} else {
				expect(list).toEqual(sortedLists[i + 1])
			}
		})
	}

	return {
		server,
		externalClient,
		externalList,
		serverShoppingList,
		createClient,
		assertEqualLists,
		playOutListSync,
	}
}
