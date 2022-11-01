import { executablePath } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { loadCookie } from './cookies'
import { login } from './login'

puppeteer.use(StealthPlugin())

export const browser = await puppeteer.launch({
  // args: ['--no-sandbox'],
  headless: true,
  ignoreHTTPSErrors: true,
  executablePath: executablePath(),
})

let hasLoadedCookies = false
export async function loadShoppingListPage() {
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

  await page.waitForXPath('//*[contains(text(), "Min inköpslista")]')

  return page
}
