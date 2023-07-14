import { Hono } from "hono"
import { ExternalClient, ShoppingListEvent, shoppingListItemSchema } from "lib"
import { z } from "zod"
import { Env } from "./Env"
import { createGoogleBot } from "./google-bot/google-bot"
import { googleListCache, targetListCache } from "./kv"

async function runBot(env: Env) {
	const { dirty, data } = await targetListCache(env.SHOPPING_BIRD_KV).get()
	console.log({ dirty })
	if (!dirty) return

	const initialStore = await googleListCache(env.SHOPPING_BIRD_KV).get()

	const { bot, browser } = await createGoogleBot({
		env,
		async onAuthFail() {
			console.log("AUTH_FAIL")
		},
	})

	const client = new ExternalClient({
		bot,
		initialStore,
		async onStoreChanged(list) {
			console.log("onStoreChanged", JSON.stringify(list))
			await googleListCache(env.SHOPPING_BIRD_KV).set(list)
		},
	})

	let evts: ShoppingListEvent[] = []

	client.onEventsReturned = async (events) => {
		console.log("onEventsReturned", JSON.stringify(events))
		evts = events
		await fetch("https://shopping-bird.up.railway.app/events", {
			method: "POST",
			body: JSON.stringify({ events }),
		}).catch((error) => console.error("FAILED TO PUSH EVENTS", error))
	}

	await client.sync(data)

	await browser.close()

	return { events: evts, targetList: { dirty, data }, initialStore }
}

const app = new Hono<{ Bindings: Env }>()

app.get("/results", async (c) => {
	const res = await googleListCache(c.env.SHOPPING_BIRD_KV).get()

	return new Response(JSON.stringify(res, null, 2), {
		headers: { contentType: "application/json" },
	})
})

app.get("/force", async (c) => {
	const data = await runBot(c.env)

	return new Response(JSON.stringify({ data }, null, 2), {
		headers: { contentType: "application/json" },
	})
})

app.post("/target", async (c) => {
	const res = z.array(shoppingListItemSchema).safeParse(await c.req.json())
	if (!res.success) return new Response(JSON.stringify(res.error), { status: 400 })

	console.log({ res: res.data })
	await targetListCache(c.env.SHOPPING_BIRD_KV).set({ dirty: true, data: res.data })

	return new Response()
})

const CRON_ENABLED = true
export default {
	async scheduled(event, env) {
		if (CRON_ENABLED) await runBot(env)
	},
	fetch: app.fetch,
} satisfies ExportedHandler<Env>
