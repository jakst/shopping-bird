import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { PageDep } from "./PageDep"

export const refreshPage = pipe(
	Effect.logDebug(`[BOT] Refreshing page`),
	Effect.flatMap(() => PageDep),
	Effect.flatMap((page) => Effect.promise(() => page.reload({ waitUntil: "networkidle2" }))),
)
