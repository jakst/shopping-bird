import puppeteer, { Page } from "@cloudflare/puppeteer"
import { instrument, instrumentDO } from "@microlabs/otel-cf-workers"
import { trace } from "@opentelemetry/api"
import { Hono } from "hono"
import {
	ExternalClient,
	Server,
	ShoppingList,
	type ShoppingListItem,
	type UpdateMessage,
	eventsMessageSchema,
	shoppingListItemSchema,
} from "lib"
import { z } from "zod"
import { type Env } from "./Env"
import { createGoogleBot } from "./google-bot/google-bot"

const handler = instrument<Env, unknown, unknown>(
	{
		async scheduled(controller, env, ctx) {
			const durableObjectId = env.DO.idFromName(env.ENV_DISCRIMINATOR ?? "dev")
			const durableObjectStub = env.DO.get(durableObjectId)
			await durableObjectStub.fetch(new Request("https://www.does-not.matter/runBot"))
		},
		async fetch(req: Request, env, ctx) {
			const durableObjectId = env.DO.idFromName(env.ENV_DISCRIMINATOR ?? "dev")
			const durableObjectStub = env.DO.get(durableObjectId)
			return await durableObjectStub.fetch(req)
		},
	},
	(env: Env, _triggger) => {
		return {
			exporter: {
				url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,

				headers: {
					authorization: env.HYPERDX_API_KEY,
				},
			},
			service: {
				name: `${env.ENV_DISCRIMINATOR}-${env.OTEL_SERVICE_NAME}`,
			},
		}
	},
)

export default handler

type Cookie = Awaited<ReturnType<Page["cookies"]>>[number]

// Run the bot max every 30s
const BOT_RUN_INTERVAL = 1000 * 30

class AShoppingBird {
	sessions = new Map<WebSocket, string>()
	server: Server | undefined
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

			const isAuthenticated = await this.getAuthState()

			this.server = new Server(
				{
					shoppingList,
					onSyncRequest: async (items) => {
						await this.state.storage.put("dirty", true)
						await this.runBot()
					},
				},
				isAuthenticated,
			)
		})

		this.app.get("/runBot", async (c) => {
			const now = Date.now()
			const botLastRanAt = (await this.state.storage.get<number>("botLastRanAt")) ?? 0
			const diff = now - botLastRanAt

			if (diff > BOT_RUN_INTERVAL) {
				console.log(`Bot run triggered (${diff / 1000}s since last run)`)

				await this.state.storage.put("botLastRanAt", now)

				const tracer = trace.getTracer("runBot")
				tracer.startActiveSpan("runBot", (span) => {
					span.setAttribute("trigger", c.req.url.includes("www.does-not.matter") ? "scheduled" : "manual")
					span.setAttribute("botLastRanAt", botLastRanAt)
					this.runBot()
						.then(() => {
							span.end()
						})
						.catch((e) => {
							span.recordException(e)
							span.end()
							console.error(e)
						})
				})
				c.status(202)
			} else {
				console.log(`Bot run ignored (${diff / 1000}s since last run)`)
				c.status(429)
			}

			return c.body(null)
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

			return c.json(
				{
					authenticated: await this.getAuthState(),
					shoppingList,
				},
				{ headers: { "Access-Control-Allow-Origin": "*" } },
			)
		})

		this.app.post("/cookies", async (c) => {
			const parsedBody = z.array(z.any()).safeParse(await c.req.json())
			if (!parsedBody.success) return c.json(parsedBody.error, { status: 400 })

			await this.state.storage.put<Cookie[]>("cookies", parsedBody.data)
			await this.setAuthState(true)

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

	async getAuthState() {
		return (await this.state.storage.get<boolean>("authenticated")) ?? false
	}

	async setAuthState(authenticated: boolean) {
		await this.state.storage.put("authenticated", authenticated)
		this.server?.changeAuthState(authenticated)
	}

	async handleSession(webSocket: WebSocket) {
		if (!this.server) throw new Error("Server not set up correctly")

		this.state.acceptWebSocket(webSocket)

		function onListChanged(payload: UpdateMessage) {
			webSocket.send(JSON.stringify(payload))
		}

		const clientId = this.server.connectClient({ onListChanged })
		this.sessions.set(webSocket, clientId)

		const tracer = trace.getTracer("runBot")
		tracer.startActiveSpan("runBot", (span) => {
			span.setAttribute("trigger", "new-connection")

			this.runBot()
				.then(() => {
					span.end()
				})
				.catch((e) => {
					span.recordException(e)
					span.end()
					console.error(e)
				})
		})
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

	async runBot(reusedBrowser?: puppeteer.Browser) {
		if (this.botRunning) {
			console.log("BOT already running")
			return
		}

		console.log("BOT starting")

		this.botRunning = true
		let browser = reusedBrowser

		try {
			await this.state.storage.put("dirty", false)

			const initialStore: ShoppingListItem[] = (await this.state.storage.get("google-list")) ?? []

			const cookies = (await this.state.storage.get<Cookie[]>("cookies")) ?? []

			browser ??= await puppeteer.launch(this.env.BROWSER)

			const { bot, page } = await createGoogleBot({
				cookies,
				browser,
				onAuthFail: async () => {
					await this.setAuthState(false)
					await fetch("https://api.pushbullet.com/v2/pushes", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Access-Token": this.env.PUSHBULLET_AUTH_TOKEN,
						},
						body: JSON.stringify({
							type: "note",
							title: "Hello Admin!",
							body: "You need to re-authenticate the Shopping Bird bot",
						}),
					})
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
		} finally {
			const isDirty = await this.state.storage.get("dirty")
			this.botRunning = false

			if (isDirty) {
				console.log("BOT is dirty, running again")
				await this.runBot(browser)
			}
		}
	}
}

// @ts-expect-error instrumentDO expects AShoppingBird to be implement
// the webSocketMessage handler. We don't need it, so let's just ignore it.
export const TheShoppingBird = instrumentDO(AShoppingBird, (env: Env, _triggger) => {
	return {
		exporter: {
			url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
			headers: {
				authorization: env.HYPERDX_API_KEY,
			},
		},
		service: {
			name: `${env.ENV_DISCRIMINATOR}-${env.OTEL_SERVICE_NAME}-DO`,
		},
	}
})
