import { cache } from "../cache";

const COOKIE_STORE = "AUTH_COOKIES";

export async function saveCookies(cookies: any[]) {
  console.log(`Saving ${cookies.length} cookies`);
  const cookieJson = JSON.stringify(cookies, null, 2);
  await cache.set(COOKIE_STORE, cookieJson);
}

export async function deleteCookies() {
  await cache.del(COOKIE_STORE)
}

export async function loadCookies(): Promise<any[]> {
  const cookieString = await cache.get(COOKIE_STORE);
  const cookies = JSON.parse(cookieString ?? '[]');
  console.log(`Restoring ${cookies.length} cookies`);
  return cookies;
}
