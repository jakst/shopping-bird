import { type ShoppingListItem, createTinybaseClient } from "lib"
import ReconnectingWebSocket from "reconnecting-websocket"
import { createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { isServer } from "solid-js/web"
import { createMergeableStore } from "tinybase"
import { createLocalPersister } from "tinybase/persisters/persister-browser"
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client"
import { env } from "./env"

const [isConnected, setIsConnected] = createSignal(true)
const [myShoppingList, setShoppingList] = createStore<ShoppingListItem[]>([])
export { myShoppingList, isConnected }

const store = createMergeableStore()

if (!isServer) {
	const WS_ENDPOINT = new URL(`/${env.ENV_DISCRIMONATOR}`, env.WS_URL).toString()

	store.addTableListener("items", (store, tableId) => {
		const table = store.getTable(tableId) as Record<string, ShoppingListItem>
		setShoppingList(reconcile(Object.values(table), { key: "id" }))
	})

	const persister = createLocalPersister(store, "shopping-list")
	await persister.startAutoLoad()
	await persister.startAutoSave()

	const ws = new ReconnectingWebSocket(WS_ENDPOINT)

	ws.addEventListener("open", () => void setIsConnected(true))
	ws.addEventListener("close", () => void setIsConnected(false))

	const synchronizer = await createWsSynchronizer(store, ws, 1)
	await synchronizer.startSync()

	// If the websocket reconnects in the future, do another explicit sync.
	synchronizer.getWebSocket().addEventListener("open", () => {
		synchronizer.load().then(() => synchronizer.save())
	})
}

export const shopping = createTinybaseClient(store)
