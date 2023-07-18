import { config } from "dotenv"
import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { z } from "zod"

config()

const EMAIL = z.string().email().parse(process.env.EMAIL)
const PASSWORD = z.string().nonempty().parse(process.env.PASSWORD)

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({
	headless: false,
	channel: "chrome",
})

const page = await browser.newPage()

await page.goto("https://shoppinglist.google.com/", {
	waitUntil: "networkidle2",
})

await page.type('input[type="email"]', EMAIL)
await page.keyboard.press("Enter")

await page.waitForSelector('input[type="password"]', { visible: true })

await page.type('input[type="password"]', PASSWORD)
await page.keyboard.press("Enter")

await page.waitForNavigation({ waitUntil: "networkidle2" })
await page.waitForXPath('//*[contains(text(), "Min inköpslista")]')

const cookies = await page.cookies()

const [res] = await Promise.all([
	await fetch("https://shopping-bird.jakst.workers.dev/cookies", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(cookies),
	}),
	await browser.close(),
])

if (res.ok) console.log(res.status, "Uploaded auth credentials successfully")
else console.log("Failed to upload credentials", await res.text())
