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
    console.log('[setup] Setting up browser...')
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

  console.log('[setup] Creating browser page...')
  _page ??= await _browser.newPage()

  if (!hasLoadedCookies) {
    console.log('[setup] Loading cookies...')
    await loadCookie(_page)
    hasLoadedCookies = true
  } else {
    console.log('[setup] Cookies already loaded. Skipping...')
  }

  return _page
}

export async function loadShoppingListPage() {
  const page = await getPage()

  console.log('[app] Navigating to https://shoppinglist.google.com/')
  await page.goto('https://shoppinglist.google.com/', {
    waitUntil: 'networkidle2',
  })

  console.log('[app] Checking if logged in...')
  const isLoggedIn =
    (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0

  if (!isLoggedIn) {
    console.log('[app] Not logged in. Logging in...')
    await login(page)
  } else {
    console.log('[app] Already loggedin in! Continuing...')
  }

  return page
}
