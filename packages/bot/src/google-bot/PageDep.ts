import { Page } from "@cloudflare/puppeteer"
import * as Context from "@effect/data/Context"

export const PageDep = Context.Tag<Page>()
