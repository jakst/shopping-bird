import puppeteer, { Page } from "@cloudflare/puppeteer"
import { Hono } from "hono"
import {
	ExternalClient,
	Server,
	ShoppingList,
	ShoppingListItem,
	UpdateMessage,
	eventsMessageSchema,
	shoppingListItemSchema,
} from "lib"
import { z } from "zod"
import { Env } from "./Env"
import { createGoogleBot } from "./google-bot/google-bot"

export default {
	async fetch(req, env, ctx) {
		const durableObjectId = env.DO.idFromName(env.ENV_DISCRIMINATOR ?? "dev")
		const durableObjectStub = env.DO.get(durableObjectId)
		return durableObjectStub.fetch(req)
	},
} satisfies ExportedHandler<Env>

type Cookie = Awaited<ReturnType<Page["cookies"]>>[number]

export class TheShoppingBird {
	sessions = new Map<WebSocket, string>()
	server: Server | undefined
	browser: puppeteer.Browser | undefined
	botRunning = false
	app = new Hono<{ Bindings: Env }>()

	constructor(private state: DurableObjectState, private env: Env) {
		state.blockConcurrencyWhile(async () => {
			const initialServerShoppingList = z
				.array(shoppingListItemSchema)
				.parse((await state.storage.get("server-shopping-list")) ?? [])

			const shoppingList = new ShoppingList(initialServerShoppingList, (v) => {
				state.storage.put("server-shopping-list", v)
			})

			this.server = new Server({
				shoppingList,
				onSyncRequest: async (items) => {
					await this.state.storage.put("dirty", true)
					await this.runBot()
				},
			})
		})

		this.app.get("/", async (c) => {
			return c.json({
				authenticated: (await this.state.storage.get<boolean>("authenticated")) ?? false,
			})
		})

		this.app.get("/export", async (c) => c.json((await this.state.storage.get("server-shopping-list")) ?? []))
		this.app.post("/import", async (c) => {
			const parsedBody = z.array(shoppingListItemSchema).safeParse(await c.req.json())
			if (!parsedBody.success) return c.json(parsedBody.error, { status: 400 })

			await this.state.storage.put("server-shopping-list", parsedBody.data)

			return c.body(null)
		})

		this.app.post("/events", async (c) => {
			const parsedBody = eventsMessageSchema.safeParse(await c.req.json())
			if (!parsedBody.success) return c.json(parsedBody.error, { status: 400 })

			const shoppingList = this.server!.pushEvents(parsedBody.data.events, parsedBody.data.clientId)

			return c.json({ shoppingList }, { headers: { "Access-Control-Allow-Origin": "*" } })
		})

		this.app.post("/cookies", async (c) => {
			const parsedBody = z.array(z.any()).safeParse(await c.req.json())
			if (!parsedBody.success) return c.json(parsedBody.error, { status: 400 })

			await this.state.storage.put<Cookie[]>("cookies", parsedBody.data)
			await this.state.storage.put("authenticated", true)

			return c.body(null)
		})

		this.app.get("/storage", async (c) => {
			return c.json({
				serverShoppingList: (await this.state.storage.get("server-shopping-list")) ?? [],
				googleList: (await this.state.storage.get("google-list")) ?? [],
			})
		})

		this.app.get("/bot", async (c) => {
			await this.state.storage.put("dirty", true)
			await this.runBot()
			return c.body(null)
		})
	}

	async fetch(request: Request) {
		if (request.headers.get("upgrade") === "websocket") {
			const pair = new WebSocketPair()
			const [clientWs, serverWs] = Object.values(pair)

			await this.handleSession(serverWs)

			return new Response(null, {
				status: 101,
				webSocket: clientWs,
				headers: { "Access-Control-Allow-Origin": "*" },
			})
		}

		const res = await this.app.fetch(request)
		res.headers.set("Access-Control-Allow-Origin", "*")
		return res
	}

	async handleSession(webSocket: WebSocket) {
		if (!this.server) throw new Error("Server not set up correctly")

		this.state.acceptWebSocket(webSocket)

		function onListChanged(payload: UpdateMessage) {
			webSocket.send(JSON.stringify(payload))
		}

		const clientId = this.server.connectClient({ onListChanged })
		this.sessions.set(webSocket, clientId)
	}

	onCloseOrError(webSocket: WebSocket) {
		const clientId = this.sessions.get(webSocket)
		this.sessions.delete(webSocket)

		if (clientId && this.server) this.server.onClientDisconnected(clientId)
	}

	async webSocketClose(webSocket: WebSocket) {
		this.onCloseOrError(webSocket)
	}

	async webSocketError(webSocket: WebSocket) {
		this.onCloseOrError(webSocket)
	}

	async runBot() {
		if (this.botRunning) {
			console.log("BOT already running")
			return
		}

		console.log("BOT starting")

		this.botRunning = true
		await this.state.storage.put("dirty", false)

		const initialStore: ShoppingListItem[] = (await this.state.storage.get("google-list")) ?? []

		const cookies = (await this.state.storage.get<Cookie[]>("cookies")) ?? []

		const browser = (this.browser ??= await puppeteer.launch(this.env.BROWSER))

		const { bot, page } = await createGoogleBot({
			cookies,
			browser,
			onAuthFail: async () => {
				await this.state.storage.put("authenticated", false)
			},
		})

		const client = new ExternalClient({
			bot,
			initialStore,
			onStoreChanged: async (list) => {
				await this.state.storage.put("google-list", list)
			},
		})

		client.onEventsReturned = async (events) => {
			this.server!.pushEvents(events)
		}

		const data: ShoppingListItem[] = (await this.state.storage.get("server-shopping-list")) ?? []

		await client.sync(data)

		await page.close()

		const isDirty = await this.state.storage.get("dirty")
		this.botRunning = false

		if (isDirty) {
			console.log("BOT is dirty, running again")
			await this.runBot()
		}
	}
}
