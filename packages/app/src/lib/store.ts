import { type ShoppingListItem, createTinybaseClient } from "lib"
import ReconnectingWebSocket from "reconnecting-websocket"
import { createStore, reconcile } from "solid-js/store"
import { isServer } from "solid-js/web"
import { createMergeableStore } from "tinybase"
import { createLocalPersister } from "tinybase/persisters/persister-browser"
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client"

const [myShoppingList, setShoppingList] = createStore<ShoppingListItem[]>([])
export { myShoppingList }

const tinybase = createMergeableStore()

async function init() {
	tinybase.addTableListener("items", (store, tableId) => {
		const table = store.getTable(tableId) as Record<string, ShoppingListItem>
		setShoppingList(reconcile(Object.values(table), { key: "id" }))
	})

	const persister = createLocalPersister(tinybase, "shopping-list")
	await persister.startAutoLoad()
	await persister.startAutoSave()

	const synchronizer = await createWsSynchronizer(
		tinybase,
		new ReconnectingWebSocket("http://localhost:8787/tinybase3"),
		1,
	)
	await synchronizer.startSync()

	// If the websocket reconnects in the future, do another explicit sync.
	synchronizer.getWebSocket().addEventListener("open", () => {
		synchronizer.load().then(() => synchronizer.save())
	})
}

if (!isServer) init()

export const shopping = createTinybaseClient(tinybase)
