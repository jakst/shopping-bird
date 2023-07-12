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
		onStoreChanged(store) {
			externalClientStoreCache.set(store)
		},
	})

	const shoppingList = new ShoppingList(initialServerShoppingList, (v) => void serverShoppingListCache.set(v))

	return new Server({
		externalClient,
		shoppingList,
	})
}

const externalClientStoreCache = createCached("external-client-store", z.array(shoppingListItemSchema), [])

const serverShoppingListCache = createCached("server-shopping-list", z.array(shoppingListItemSchema), [])
