import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Layer from "@effect/io/Layer"
import * as Logger from "@effect/io/Logger"
import * as LoggerLevel from "@effect/io/Logger/Level"
import * as Runtime from "@effect/io/Runtime"
import * as Scope from "@effect/io/Scope"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { getBrowser, getPage } from "./bot/browser"
import { PageDep } from "./bot/google-bot/PageDep"
import { goToShoppingListPage } from "./bot/google-bot/google-bot"
import { removeItemAtPosition } from "./bot/google-bot/removeItemAtPosition"
import { cache } from "./cache"

const ResourceLive = Resource.layer({ serviceName: "backend" })

// const exporter = new OTLPTraceExporter({
// 	url: "http://127.0.0.1:4318/v1/traces",
// })
const exporter = new OTLPTraceExporter({
	url: "https://otel.baselime.io/v1",
	headers: {
		"x-api-key": "wkx8Myimco1ZQQrAmlj9S8iq4U0Hbd9B2eZDI6DQ",
	},
})

const NodeSdkLive = NodeSdk.layer({
	traceExporter: exporter,
})

const TracingLive = Layer.provide(ResourceLive, Layer.merge(NodeSdkLive, Tracer.layer))

const makeCustomRuntime = <E, A>(layer: Layer.Layer<never, E, A>) =>
	Effect.runPromise(
		Effect.gen(function* ($) {
			const scope = yield* $(Scope.make())
			const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(scope))
			return {
				runPromise: Runtime.runPromise(runtime),
				close: () => Effect.runPromise(Scope.close(scope, Exit.unit())),
			}
		}),
	)

async function main() {
	const { close, runPromise } = await makeCustomRuntime(TracingLive)

	await cache.connect()
	const page = await getPage()

	await pause(1000)

	const { isLoggedIn } = await goToShoppingListPage(page)

	const program = pipe(
		removeItemAtPosition(0),
		Effect.provideService(PageDep, PageDep.of(page)),
		Logger.withMinimumLogLevel(LoggerLevel.Debug),
	)
	await runPromise(program)

	console.log("done")

	await close()
	const browser = await getBrowser()
	await browser.close()
	process.exit(0)
}

main()

function pause(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}
