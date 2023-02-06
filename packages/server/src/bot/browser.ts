import { executablePath, Protocol } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { env } from "../env";
import { deleteCookies, loadCookies, saveCookies } from "./cookies";

puppeteer.use(StealthPlugin());

function cache<T>(fn: () => Promise<T>) {
  let value: T;
  return async () => {
    value ??= await fn();
    return value;
  };
}

const getBrowser = cache(() => {
  console.log("[setup] Setting up browser...");
  return puppeteer.launch({
    executablePath: executablePath(),
    headless: env.FULL_BROWSER !== "1",
    args: ["--no-sandbox"],
    timeout: 5_000,
  });
});

export const getPage = cache(async () => {
  const browser = await getBrowser();
  console.log("[setup] Creating browser page...");
  const page = await browser.newPage();

  const cookies = await getCookies();

  if (cookies && cookies.length > 0) await page.setCookie(...cookies);

  return page;
});

let _cookies: Protocol.Network.CookieParam[] | null = null;

export async function getCookies() {
  return (_cookies ??= await loadCookies());
}

export async function setCookies(cookies: any[]) {
  _cookies = cookies;
  const page = await getPage();
  await page.setCookie(...cookies);
  await saveCookies(cookies);
}

export async function clearCookies() {
  _cookies = null;
  await deleteCookies();
}
