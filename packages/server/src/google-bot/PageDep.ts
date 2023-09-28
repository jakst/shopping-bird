import { Page } from "@cloudflare/puppeteer"
import { Context } from "effect"

export const PageDep = Context.Tag<Page>()
