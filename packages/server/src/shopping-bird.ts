import { Server, ShoppingList, shoppingListItemSchema } from "lib"
import { z } from "zod"
import { createCached } from "./create-cached"

export async function createShoppingBird() {
	const initialServerShoppingList = await serverShoppingListCache.get()

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
			// NOOP! TODO: add back when we support running the bot more frequently
		},
	})

	return server
}

const serverShoppingListCache = createCached("server-shopping-list", z.array(shoppingListItemSchema), [])
