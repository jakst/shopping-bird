import fs from 'node:fs/promises'

const COOKIE_STORE = 'cookies.json'

export async function saveCookies(cookies: any[]) {
  console.log(`Saving ${cookies.length} cookies`)
  const cookieJson = JSON.stringify(cookies, null, 2)
  await fs.writeFile(COOKIE_STORE, cookieJson)
}

export async function deleteCookies() {
  await fs.unlink(COOKIE_STORE)
}

export async function loadCookies(): Promise<any[]> {
  const cookieJson = await fs.readFile(COOKIE_STORE, { encoding: 'utf-8' })
  const cookies = JSON.parse(cookieJson)
  console.log(`Restoring ${cookies.length} cookies`)
  return cookies
}
