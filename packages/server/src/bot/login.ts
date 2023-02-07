import { type Page } from "puppeteer"
import { env } from "../env"
import { saveCookies } from "./cookies"

export async function login(page: Page) {
	await page.type('input[type="email"]', env.EMAIL)
	await page.keyboard.press("Enter")

	await page.waitForSelector('input[type="password"]', { visible: true })

	await page.type('input[type="password"]', env.PASSWORD)
	await page.keyboard.press("Enter")

	await page.waitForNavigation({ waitUntil: "networkidle2" })
	await page.waitForXPath('//*[contains(text(), "Min inköpslista")]')

	const cookies = await page.cookies()
	await saveCookies(cookies)
}
