import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { env } from "../env";

puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  await page.goto("https://shoppinglist.google.com/", {
    waitUntil: "networkidle2",
  });

  await page.type('input[type="email"]', env.EMAIL);
  await page.keyboard.press("Enter");

  await page.waitForSelector('input[type="password"]', { visible: true });

  await page.type('input[type="password"]', env.PASSWORD);
  await page.keyboard.press("Enter");

  await page.waitForNavigation({ waitUntil: "networkidle2" });
  await page.waitForXPath('//*[contains(text(), "Min inköpslista")]');

  const cookies = await page.cookies();

  const res = await fetch("https://hello-bird.fly.dev/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookies }),
  });

  if (res.ok) {
    console.log(res.status, "Uploaded auth credentials successfully");
  } else {
    console.log("Failed to upload credentials", await res.text());
  }

  await browser.close();
}

run();
