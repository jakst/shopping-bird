import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { env } from "../env";
import { deleteCookies, loadCookies, saveCookies } from "./cookies";

puppeteer.use(StealthPlugin());

function cache<T extends () => Promise<any>>(fn: T) {
  let value: Awaited<ReturnType<T>>;
  return async () => {
    value ??= await fn();
    return value;
  };
}

const getBrowser = cache(() => {
  console.log("[setup] Setting up browser...");
  return puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
    ignoreHTTPSErrors: true,
    timeout: 30000,
    executablePath: env.PUPPETEER_EXECUTABLE_PATH ?? executablePath(),
  });
});

const getPage = cache(async () => {
  const browser = await getBrowser();
  console.log("[setup] Creating browser page...");
  return browser.newPage();
});

let _cookies: any[] | null = null;

export async function getCookies() {
  if (!_cookies) {
    try {
      _cookies = await loadCookies();
    } catch {
      return null;
    }
  }

  return _cookies;
}

export async function setCookies(cookies: any[]) {
  _cookies = cookies;
  const page = await getPage();
  page.setCookie(...cookies);
  await saveCookies(cookies);
}

async function clearCookies() {
  _cookies = null;
  await deleteCookies();
}

let pageRefreshedAt = 0;
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export async function loadShoppingListPage(forceRefresh = false) {
  const page = await getPage();
  const cookies = await getCookies();

  if (!cookies) {
    throw new Error("NO_COOKIES");
  }

  await page.setCookie(...cookies);

  const now = Date.now();
  const shouldRefresh =
    forceRefresh || now - pageRefreshedAt > REFRESH_INTERVAL;

  if (shouldRefresh) {
    console.log("Loading/refreshing page...");
    pageRefreshedAt = now;

    console.log("[app] Navigating to https://shoppinglist.google.com/");
    await page.goto("https://shoppinglist.google.com/", {
      waitUntil: "networkidle2",
    });

    console.log("[app] Checking if logged in...");
    const isLoggedIn =
      (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0;

    if (!isLoggedIn) {
      await clearCookies();
      throw new Error("BAD_COOKIES");
    }
  }

  return page;
}

// Warm up browser
getPage();
