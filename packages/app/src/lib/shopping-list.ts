import { type ShoppingListItem, createTinybaseClient } from "lib"
import ReconnectingWebSocket from "reconnecting-websocket"
import { createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { isServer } from "solid-js/web"
import { createMergeableStore } from "tinybase"
import { createLocalPersister } from "tinybase/persisters/persister-browser"
import { createWsSynchronizer } from "tinybase/synchronizers/synchronizer-ws-client"
import { env } from "./env"

const [failedToConnect, setFailedToConnect] = createSignal(false)
const [myShoppingList, setShoppingList] = createStore<ShoppingListItem[]>([])
export { myShoppingList, failedToConnect }

const store = createMergeableStore()

async function init() {
	const WS_ENDPOINT = new URL(`/${env.ENV_DISCRIMONATOR}`, env.WS_URL).toString()

	store.addTableListener("items", (store, tableId) => {
		const table = store.getTable(tableId) as Record<string, ShoppingListItem>
		setShoppingList(
			reconcile(
				// Someimtes we get items without IDs for some reason. Filter those out.
				Object.values(table).filter((item) => item.id),
				{ key: "id" },
			),
		)
	})

	const persister = createLocalPersister(store, "shopping-list")
	await persister.startAutoLoad()
	await persister.startAutoSave()

	const ws = new ReconnectingWebSocket(WS_ENDPOINT)

	ws.addEventListener("open", () => void setFailedToConnect(false))
	ws.addEventListener("close", () => void setFailedToConnect(true))
	ws.addEventListener("error", () => void setFailedToConnect(true))

	document.addEventListener("visibilitychange", () => {
		setFailedToConnect(false)
	})

	const synchronizer = await createWsSynchronizer(store, ws, 1)
	await synchronizer.startSync()

	// If the websocket reconnects in the future, do another explicit sync.
	synchronizer.getWebSocket().addEventListener("open", () => {
		synchronizer.load().then(() => synchronizer.save())
	})

	await persister.save()
}

if (!isServer) {
	init()
	;(window as any).tb = store
}

export const shopping = createTinybaseClient(store)
