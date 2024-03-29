// 	Needed for HTML element types
/// <reference lib="dom" />

import puppeteer, { ElementHandle, Page } from "@cloudflare/puppeteer"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LoggerLevel from "@effect/io/Logger/Level"
import { type Bot, trimAndUppercase } from "lib"
import { PageDep } from "./PageDep"
import { removeItemAtPosition } from "./removeItemAtPosition"

const pause = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

interface CreateGoogleBotDeps {
	onAuthFail: () => Promise<void>
	browser: puppeteer.Browser
	cookies: any[]
}

export async function createGoogleBot({ onAuthFail, browser, cookies }: CreateGoogleBotDeps) {
	const page = await browser.newPage()

	await page.setCookie(...cookies)

	const bot = {
		async refreshList() {
			await pause(1000)

			const { isLoggedIn } = await goToShoppingListPage(page)

			if (!isLoggedIn) {
				await onAuthFail()
				throw new Error("You need to authenticate")
			}

			const list = await getList(page)

			for (const item of list) {
				// Fix all incorrectly named items
				const fixedName = trimAndUppercase(item.name)
				// Only rename when item is not checked, because otherwise we'll trigger
				// the bug mentioned below where the item becomes unchecked
				if (fixedName !== item.name && !item.checked) {
					console.log(`[BOT]: Renaming incorrectly named item from "${item.name}" to "${fixedName}"`)
					await rename(page, item.name, fixedName)
					item.name = fixedName
				}
			}
		},
		async getList() {
			const list = (await getList(page)).map((item, index) => ({
				index,
				...item,
			}))

			// Return a reversed array, because Google stores the newest items on top
			return list.reverse()
		},
		async ADD_ITEM(name, checked = false) {
			const newItemInput = (await page.$('input[aria-label="Lägg till objekt"]'))!

			await newItemInput.type(name)
			await newItemInput.press("Enter")

			await page.waitForXPath('//*[text()="Varan har lagts till"]')

			await pause(500)

			if (checked) await setItemCheckedAtPosition(page, 0, true)
		},
		async DELETE_ITEM(index) {
			const program = pipe(
				removeItemAtPosition(index),
				Effect.provideService(PageDep, PageDep.of(page)),
				Logger.withMinimumLogLevel(LoggerLevel.Debug),
			)
			await Effect.runPromise(program)
		},
		async SET_ITEM_CHECKED(index, value) {
			await setItemCheckedAtPosition(page, index, value)
		},
	} satisfies Bot

	return { bot, page }
}

export async function goToShoppingListPage(page: Page) {
	if (page.url() !== "https://shoppinglist.google.com/") {
		await page.goto("https://shoppinglist.google.com/", {
			waitUntil: "networkidle2",
		})
	} else {
		await page.reload({ waitUntil: "networkidle2" })
	}

	const isLoggedIn = (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0

	return { isLoggedIn }
}

async function getList(page: Page) {
	const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

	const items = await Promise.all(
		liElements.map(async (liElement) => {
			const [name, checked] = await Promise.all([
				liElement.evaluate((el) => el.textContent ?? ""),
				liElement.$("input").then((input) => input!.evaluate((el) => el.checked)),
			])

			return { name, checked }
		}),
	)

	return items
}

async function rename(page: Page, oldName: string, newName: string) {
	// There's a bug where Google's app unchecks items when you rename them,
	// but it's not visible until you reload the page.
	// TODO: Work around by limiting renames to unchecked items.

	console.log(`[BOT]: Renaming item from "${oldName}" to "${newName}"`)
	const [nameDisplay] = (await page.$x(`//ul/li//div[@role="button" and text()="${oldName}"]`)) as [
		ElementHandle<HTMLDivElement>,
	]
	await nameDisplay.click()

	await Promise.all([...oldName].map(() => nameDisplay.press("Backspace")))
	await nameDisplay.type(newName)

	// Press the submit button, one tab away from the input field
	await page.keyboard.press("Tab")
	await page.keyboard.press("Enter")

	await pause(1000)
}

async function setItemCheckedAtPosition(page: Page, index: number, value: boolean) {
	const checkbox = (await page.$$(`ul[aria-label="Min inköpslista"] > li input`))[index]

	if (checkbox) {
		const isChecked = await (checkbox as ElementHandle<HTMLInputElement>).evaluate((el) => el.checked)

		if ((isChecked && !value) || (!isChecked && value)) {
			await checkbox.click()
			await pause(1000)
		}
	}
}
