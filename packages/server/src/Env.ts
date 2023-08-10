import puppeteer from "@cloudflare/puppeteer"

export type Env = {
	BROWSER: puppeteer.BrowserWorker
	DO: DurableObjectNamespace
	ENV_DISCRIMINATOR: string
}