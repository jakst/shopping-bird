import { executablePath, Protocol } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
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

async function clearCookies() {
  _cookies = null;
  await deleteCookies();
}

let pageRefreshedAt = 0;
const REFRESH_INTERVAL = 59_000; // Every 59 seconds

export async function loadShoppingListPage() {
  const now = Date.now();
  const shouldRefresh = now - pageRefreshedAt > REFRESH_INTERVAL;

  const tag = `[loadShoppingListPage shouldRefresh = ${
    shouldRefresh ? "true" : "false"
  }]`;

  console.time(tag);

  const page = await getPage();

  if (page.url() !== "https://shoppinglist.google.com/") {
    await page.goto("https://shoppinglist.google.com/", {
      waitUntil: "networkidle2",
    });
  } else if (shouldRefresh) {
    pageRefreshedAt = now;
    await page.reload({ waitUntil: "networkidle2" });
  }

  const isLoggedIn =
    (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0;

  if (!isLoggedIn) {
    await clearCookies();
    throw new Error("BAD_COOKIES");
  }

  console.timeEnd(tag);

  return page;
}
