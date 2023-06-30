import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LoggerLevel from "@effect/io/Logger/Level"
import * as Schedule from "@effect/io/Schedule"
import { exit } from "process"
import { ElementHandle } from "puppeteer"
import { getBrowser, getPage } from "./bot/browser"
import { goToShoppingListPage } from "./bot/google-bot"
import { cache } from "./cache"

function pause(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

class LocateItemError {
	readonly _tag = "LocateItemError"
}

class DeleteItemError {
	readonly _tag = "DeleteItemError"
}

function retryPolicyWithSideEffect(logName: string, retries: number, fn: Effect.Effect<never, never, void>) {
	return pipe(
		Schedule.recurs(retries),
		Schedule.addDelay(() => Duration.seconds(1)),
		Schedule.tapOutput((iteration) =>
			iteration < retries
				? Effect.all(fn, Effect.logDebug(`[BOT] ${logName} failed. Retry #${iteration + 1}`))
				: Effect.logDebug(`[BOT] ${logName} failed. No more retries.`),
		),
	)
}

interface NameDisplay {
	name: string
	element: ElementHandle<HTMLDivElement>
}

async function run() {
	await cache.connect()
	const page = await getPage()

	await pause(1000)

	const { isLoggedIn } = await goToShoppingListPage(page)

	async function locateItem(position: number) {
		const element = (await page.$x(`//ul/li//div[@role="button"]`))[position] as ElementHandle<HTMLDivElement>
		if (!element) return Promise.reject()

		const name = await element.evaluate((el) => el.textContent)
		if (!name) return Promise.reject()

		return { element, name }
	}

	async function deleteItem(nameElement: NameDisplay["element"]) {
		await nameElement.click()

		// Press the trash button, two tabs away from the input field
		await page.keyboard.press("Tab")
		await page.keyboard.press("Tab")
		await page.keyboard.press("Enter")

		await page.waitForXPath('//*[text()="Varan har raderats"]', { timeout: 3_000 })
		await pause(1000)
	}

	const refreshPage = pipe(
		Effect.logDebug(`[BOT] Refreshing page`),
		Effect.flatMap(() =>
			Effect.promise(async () => {
				await goToShoppingListPage(page)
			}),
		),
	)

	function removeItemAtPosition2(position: number) {
		return pipe(
			Effect.logDebug(`[BOT] Looking for item at position ${position}`),
			Effect.flatMap(() =>
				pipe(
					Effect.tryCatchPromise(
						() => locateItem(position),
						() => new LocateItemError(),
					),
				),
			),
			Effect.retry(retryPolicyWithSideEffect("locateItem", 2, refreshPage)),
			Effect.tap(({ name }) => Effect.logDebug(`[BOT] Found item '${name}' at position ${position}`)),
			Effect.tap(({ name }) => Effect.logInfo(`[BOT] Deleting item '${name}' at position ${position}`)),
			Effect.flatMap((nameDisplay) =>
				Effect.tryCatchPromise(
					() => deleteItem(nameDisplay.element),
					() => new DeleteItemError(),
				),
			),
			Effect.catchTags({
				LocateItemError: () => Effect.logError(`[BOT] Couldn't locate item at position ${position}`),
				DeleteItemError: () => Effect.logError(`[BOT] Couldn't delete item at position ${position}`),
			}),
			Logger.withMinimumLogLevel(LoggerLevel.Debug),
		)
	}

	await Effect.runPromise(removeItemAtPosition2(10000))

	const browser = await getBrowser()
	await browser.close()
	exit(0)
}

run()
