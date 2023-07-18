import { ElementHandle, Page } from "@cloudflare/puppeteer"
import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Schedule from "@effect/io/Schedule"
import { PageDep } from "./PageDep"
import { refreshPage } from "./refreshPage"

class LocateItemError {
	readonly _tag = "LocateItemError"
}

class DeleteItemError {
	readonly _tag = "DeleteItemError"
}

function sleepWithSpan(duration: Duration.Duration) {
	return pipe(Effect.sleep(duration), Effect.withSpan("sleep", { attributes: { duration: `${duration.millis} ms` } }))
}

function retryPolicyWithSideEffect<R>(logName: string, retries: number, fn: Effect.Effect<R, never, void>) {
	return pipe(
		Schedule.recurs(retries),
		Schedule.addDelay(() => Duration.seconds(1)),
		Schedule.tapOutput((iteration) =>
			iteration < retries
				? Effect.all(Effect.logWarning(`[BOT] ${logName} failed. Retry #${iteration + 1}`), fn)
				: Effect.logWarning(`[BOT] ${logName} failed. No more retries.`),
		),
	)
}

interface NameDisplay {
	name: string
	element: ElementHandle<HTMLDivElement>
}

async function locateItem(page: Page, position: number) {
	const element = (await page.$x(`//ul/li//div[@role="button"]`))[position] as ElementHandle<HTMLDivElement>
	if (!element) return Promise.reject()

	const name = await element.evaluate((el) => el.textContent)
	if (!name) return Promise.reject()

	return { element, name }
}

async function deleteItem(page: Page, nameElement: NameDisplay["element"]) {
	await nameElement.click()

	// Press the trash button, two tabs away from the input field
	await page.keyboard.press("Tab")
	await page.keyboard.press("Tab")
	await page.keyboard.press("Enter")

	await page.waitForXPath('//*[text()="Varan har raderats"]', { timeout: 5_000 })
}

export function removeItemAtPosition(position: number) {
	return pipe(
		PageDep,
		Effect.flatMap((page) =>
			pipe(
				Effect.logDebug(`[BOT] Looking for item at position ${position}`),
				Effect.flatMap(() =>
					Effect.tryCatchPromise(
						() => locateItem(page, position),
						() => new LocateItemError(),
					),
				),
				Effect.withSpan("locateItemAttempt"),
				Effect.retry(retryPolicyWithSideEffect("locateItem", 2, refreshPage)),
				Effect.tap(({ name }) => Effect.logDebug(`[BOT] Found item '${name}' at position ${position}`)),
				Effect.withSpan("locateItem"),
				Effect.flatMap((nameDisplay) =>
					pipe(
						Effect.logInfo(`[BOT] Deleting item '${nameDisplay.name}' at position ${position}`),
						Effect.flatMap(() =>
							Effect.tryCatchPromise(
								() => deleteItem(page, nameDisplay.element),
								() => new DeleteItemError(),
							),
						),
						Effect.withSpan("deleteItem", { attributes: { itemName: nameDisplay.name } }),
					),
				),
				Effect.catchTags({
					LocateItemError: () => Effect.logError(`[BOT] Couldn't locate item at position ${position}`),
					DeleteItemError: () => Effect.logError(`[BOT] Couldn't delete item at position ${position}`),
				}),
				Effect.tap(() => sleepWithSpan(Duration.seconds(1))),
				Effect.withSpan("removeItemAtPosition", { attributes: { position: String(position) } }),
			),
		),
	)
}
