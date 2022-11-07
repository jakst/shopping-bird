import { Browser, executablePath, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { env } from '../env'
import { loadCookie } from './cookies'
import { login } from './login'

puppeteer.use(StealthPlugin())

let _browser: Browser | null = null
let _page: Page | null = null
let hasLoadedCookies = false
async function getPage() {
  if (!_browser) {
    _browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
      executablePath: env.isLocalDev
        ? executablePath()
        : '/usr/bin/google-chrome',
    })
  }

  _page ??= await _browser.newPage()

  if (!hasLoadedCookies) {
    await loadCookie(_page)
    hasLoadedCookies = true
  }

  return _page
}

export async function loadShoppingListPage() {
  const page = await getPage()

  await page.goto('https://shoppinglist.google.com/', {
    waitUntil: 'networkidle2',
  })

  const isLoggedIn =
    (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0

  if (!isLoggedIn) await login(page)

  return page
}
