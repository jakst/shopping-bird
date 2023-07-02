import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { exit } from "process"
import { getBrowser, getPage } from "./bot/browser"
import { PageDep } from "./bot/effect/PageDep"
import { removeItemAtPosition } from "./bot/effect/removeItemAtPosition"
import { goToShoppingListPage } from "./bot/google-bot"
import { cache } from "./cache"

function pause(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

async function run() {
	await cache.connect()
	const page = await getPage()

	await pause(1000)

	const { isLoggedIn } = await goToShoppingListPage(page)

	const program = pipe(removeItemAtPosition(1), Effect.provideService(PageDep, PageDep.of(page)))
	await Effect.runPromise(program)

	const browser = await getBrowser()
	await browser.close()
	exit(0)
}

run()
