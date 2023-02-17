import fastify from "fastify"
import FastifySSEPlugin from "fastify-sse-v2"
import { eventListSchema, UpdateMessage } from "lib"
import { z } from "zod"
import { getCookies, setCookies } from "./bot/browser"
import { cache } from "./cache"
import { env } from "./env"
import { createShoppingBird } from "./shopping-bird"

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
	const isPreview = Boolean(origin?.match(/^https:\/\/shopping-bird-[a-z0-9-]*jakst.vercel.app$/))

	// Allow production, PR previews, and local dev environments to make CORS requests
	if (isProd || isPreview || env.isLocalDev) {
		reply.headers({ "Access-Control-Allow-Origin": origin })
	}

	done()
})

f.get(
	"/ping",
	async () => `pong
    git commit: ${env.GIT_REVISION}
    cookies: ${(await getCookies())?.length ?? "no cookies"}
  `,
)

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

async function run() {
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

		await f.listen({
			port: env.PORT,
			host: env.HOST,
		})
	} catch (err) {
		console.log(err)
		f.log.error(err)
		process.exit(1)
	}
}

run()
