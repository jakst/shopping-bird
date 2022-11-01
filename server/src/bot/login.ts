import { type Page } from 'puppeteer'
import { saveCookie } from './cookies'
import * as dotenv from 'dotenv'

dotenv.config()
const { EMAIL, PASSWORD } = process.env as Record<string, string>

export async function login(page: Page) {
  await page.type('input[type="email"]', EMAIL)
  await page.keyboard.press('Enter')

  await page.waitForSelector('input[type="password"]', { visible: true })

  await page.type('input[type="password"]', PASSWORD)
  await page.keyboard.press('Enter')

  await page.waitForNavigation({ waitUntil: 'networkidle2' })

  await saveCookie(page)
}
