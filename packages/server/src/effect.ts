import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LoggerLevel from "@effect/io/Logger/Level"
import { getBrowser, getPage } from "./bot/browser"
import { PageDep } from "./bot/google-bot/PageDep"
import { goToShoppingListPage } from "./bot/google-bot/google-bot"
import { removeItemAtPosition } from "./bot/google-bot/removeItemAtPosition"
import { cache } from "./cache"
import { makeCustomRuntime } from "./makeCustomRuntime"
import { TracingLive } from "./otel"

async function main() {
	const { close, runPromise } = await makeCustomRuntime(TracingLive)

	await cache.connect()
	const page = await getPage()

	await pause(1000)

	const { isLoggedIn } = await goToShoppingListPage(page)

	const program = pipe(
		removeItemAtPosition(1000),
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
