import { ExternalClient, Server, ShoppingList, shoppingListItemSchema } from "lib"
import { z } from "zod"
import { createGoogleBot } from "./bot/google-bot/google-bot"
import { createCached } from "./create-cached"
import { notifyAuthFail } from "./notifyAuthFail"

export async function createShoppingBird() {
	const [bot, initialExternalClientStore, initialServerShoppingList] = await Promise.all([
		createGoogleBot({ onAuthFail: notifyAuthFail }),
		externalClientStoreCache.get(),
		serverShoppingListCache.get(),
	])

	const externalClient = new ExternalClient({
		bot,
		initialStore: initialExternalClientStore,
		async onStoreChanged(store) {
			await externalClientStoreCache.set(store)
		},
	})

	const shoppingList = new ShoppingList(initialServerShoppingList, (v) => {
		serverShoppingListCache.set(v)

		fetch("https://shopping-bot.jakst.workers.dev/target", {
			method: "POST",
			body: JSON.stringify(v),
			headers: { "Content-Type": "application/json" },
		}).catch((err) => console.error("FAILED TO UPDATE TARGET", err))
	})

	const server = new Server({
		shoppingList,
		async onSyncRequest(items) {
			await externalClient.sync(items)
		},
	})

	externalClient.onEventsReturned = (events) => server.pushEvents(events)

	return server
}

const externalClientStoreCache = createCached("external-client-store", z.array(shoppingListItemSchema), [])

const serverShoppingListCache = createCached("server-shopping-list", z.array(shoppingListItemSchema), [])
