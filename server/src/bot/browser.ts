import { Browser, executablePath } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { env } from '../env'
import { loadCookie } from './cookies'
import { login } from './login'

puppeteer.use(StealthPlugin())

let browser: Browser | null = null
let hasLoadedCookies = false
export async function loadShoppingListPage() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
      executablePath: env.isLocalDev
        ? executablePath()
        : '/usr/bin/google-chrome',
    })
  }

  const page = await browser.newPage()

  if (!hasLoadedCookies) {
    await loadCookie(page)
    hasLoadedCookies = true
  }

  await page.goto('https://shoppinglist.google.com/', {
    waitUntil: 'networkidle2',
  })

  const isLoggedIn =
    (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0

  if (!isLoggedIn) await login(page)

  return page
}
