import { Protocol } from "puppeteer";
import { cache } from "../cache";

const COOKIE_STORE = "AUTH_COOKIES";

export async function saveCookies(cookies: any[]) {
  console.log(`Saving ${cookies.length} cookies`);
  const cookieString = JSON.stringify(cookies, null, 2);
  await cache.set(COOKIE_STORE, cookieString);
}

export async function deleteCookies() {
  await cache.del(COOKIE_STORE);
}

export async function loadCookies(): Promise<Protocol.Network.CookieParam[]> {
  const cookieString = await cache.get(COOKIE_STORE);
  const cookies = JSON.parse(
    cookieString ?? "[]",
  ) as Protocol.Network.CookieParam[];
  console.log(`Restoring ${cookies.length} cookies`);
  return cookies;
}
