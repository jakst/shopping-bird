import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
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

let _cookies: any[] | null = null;

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
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export async function loadShoppingListPage(forceRefresh = false) {
  console.time("[loadShoppingListPage]");
  const page = await getPage();

  const now = Date.now();
  const shouldRefresh =
    forceRefresh || now - pageRefreshedAt > REFRESH_INTERVAL;

  if (shouldRefresh) {
    pageRefreshedAt = now;

    if (forceRefresh) {
      await page.reload({ waitUntil: "networkidle2" });
    } else {
      await page.goto("https://shoppinglist.google.com/", {
        waitUntil: "networkidle2",
      });
    }

    const isLoggedIn =
      (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0;

    if (!isLoggedIn) {
      await clearCookies();
      throw new Error("BAD_COOKIES");
    }
  }

  console.timeEnd("[loadShoppingListPage]");

  return page;
}
