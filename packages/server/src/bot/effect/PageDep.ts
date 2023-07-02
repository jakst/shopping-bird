import * as Context from "@effect/data/Context"
import { Page } from "puppeteer"

export const PageDep = Context.Tag<Page>()
