import fs from 'node:fs/promises'
import { type Page } from 'puppeteer'

const COOKIE_STORE = 'cookies.json'

export async function saveCookie(page: Page) {
  const cookies = await page.cookies()
  console.log(`Saving ${cookies.length} cookies`)
  const cookieJson = JSON.stringify(cookies, null, 2)
  await fs.writeFile(COOKIE_STORE, cookieJson)
}

export async function loadCookie(page: Page) {
  try {
    const cookieJson = await fs.readFile(COOKIE_STORE, { encoding: 'utf-8' })
    const cookies = JSON.parse(cookieJson)
    console.log(`Restoring ${cookies.length} cookies`)
    await page.setCookie(...cookies)
  } catch (error) {
    console.log('Failed to load cookies')
  }
}
