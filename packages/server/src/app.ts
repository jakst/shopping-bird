import fastify from "fastify"
import FastifySSEPlugin from "fastify-sse-v2"
import { eventListSchema, UpdateMessage } from "lib"
import { z } from "zod"
import { getCookies, setCookies } from "./bot/browser"
import { cache } from "./cache"
import { env } from "./env"
import { createShoppingBird } from "./shopping-bird"
import { traceExporter } from "./traceExporter"

const eventsEndpointSchema = z.object({
	clientId: z.string(),
	events: eventListSchema,
})

const f = fastify({
	maxParamLength: 5000,
})

f.addHook("preHandler", (request, reply, done) => {
	const { origin } = request.headers

	const isProd = origin === "https://shopping-bird.vercel.app"
	const isPreview = Boolean(origin?.match(/^https:\/\/shopping-bird-[a-z0-9-]*jakst\.vercel\.app$/))
	const isLocalClient = Boolean(origin?.match(/^https?:\/\/norlin\d*(\.local)?(:\d+)?$/))

	// Allow production, PR previews, and local dev environments to make CORS requests
	if (isProd || isPreview || isLocalClient || env.isLocalDev) {
		reply.headers({ "Access-Control-Allow-Origin": origin })
	}

	done()
})

f.get("/", async (_req, reply) => {
	reply.send({
		commit: env.GIT_REVISION,
		authenticated: ((await getCookies()) ?? []).length > 0,
	})
})

f.post("/auth", async (req, reply) => {
	const { cookies } = req.body as { cookies: any[] }
	await setCookies(cookies)
	if (!appStarted) await startApp()
	console.log(`Successfully authed with ${cookies.length} cookies`)
	reply.send()
})

let appStarted = false
let requestLock = false
async function startApp() {
	appStarted = true
	f.register(FastifySSEPlugin)

	const shoppingBird = await createShoppingBird()

	f.get("/register", (request, reply) => {
		function onListChanged(payload: UpdateMessage) {
			reply.sse({ event: "update", data: JSON.stringify(payload) })
		}

		const clientId = shoppingBird.connectClient({ onListChanged })
		request.raw.on("close", () => shoppingBird.onClientDisconnected(clientId))
	})

	f.post("/events", async (request, reply) => {
		const parsedBody = eventsEndpointSchema.safeParse(JSON.parse(request.body as string))

		if (!parsedBody.success || requestLock) {
			return reply.code(400)
		}

		const shoppingList = shoppingBird.pushEvents(parsedBody.data.events, parsedBody.data.clientId)
		await reply.send({ shoppingList })
		requestLock = false
	})

	await shoppingBird.refreshDataFromExternalClient()
}

let started = false
export async function run() {
	try {
		console.log("[app] Starting web server", {
			GIT_REVISION: env.GIT_REVISION,
			PORT: env.PORT,
			HOST: env.HOST,
		})

		await cache.connect()

		const cookies = await getCookies()

		if (cookies.length > 0) await startApp()
		else console.log("No cookies found. Waiting for auth...")

		if (started) await f.close()
		await f.listen({
			port: env.PORT,
			host: env.HOST,
		})
		sendStartedEvent()
		started = true
	} catch (err) {
		console.log(err)
		f.log.error(err)
		process.exit(1)
	}

	if (import.meta.hot) {
		import.meta.hot.on("vite:beforeFullReload", () => {
			f.close()
		})

		import.meta.hot.dispose(() => {
			f.close()
		})
	}
}

run()

const start = Date.now()

function sendStartedEvent() {
	console.log("Send started event!")
	const end = Date.now()

	traceExporter.send(
		[
			{
				instrumentationLibrary: { name: "custom" },
				spanContext: () => ({
					spanId: generate32HexaDecimalChars(16),
					traceId: generate32HexaDecimalChars(32),
					traceFlags: 0,
				}),
				duration: [start / 1000, end / 1000],
				startTime: [start / 1000, 0],
				endTime: [end / 1000, 0],
				ended: true,
				links: [],
				status: { code: 1 },
				kind: 0,
				events: [],
				droppedLinksCount: 0,
				droppedEventsCount: 0,
				droppedAttributesCount: 0,
				name: "Startup",
				attributes: {},
				resource: {
					attributes: { "service.name": "backend" },
					merge: (resource: any) => resource,
				},
			},
		],
		() => console.log("sent"),
		(err) => console.log("err", err),
	)
}

function generate32HexaDecimalChars(n: number) {
	const chars = "0123456789abcdef"
	let result = ""
	for (let i = n; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)]
	return result
}
