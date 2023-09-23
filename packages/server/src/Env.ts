import puppeteer from "@cloudflare/puppeteer"

export type Env = {
	BROWSER: puppeteer.BrowserWorker
	DO: DurableObjectNamespace
	ENV_DISCRIMINATOR: string
	PUSHBULLET_AUTH_TOKEN: string
	HYPERDX_API_KEY: string
	OTEL_SERVICE_NAME: string
	OTEL_EXPORTER_OTLP_ENDPOINT: string
}
