import puppeteer from "@cloudflare/puppeteer"

export type Env = {
	SHOPPING_BIRD_KV: KVNamespace
	BOT_BROWSER: puppeteer.BrowserWorker
}
