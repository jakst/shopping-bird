import { Effect, pipe } from "effect"
import { PageDep } from "./PageDep"

export const refreshPage = pipe(
	Effect.logDebug(`[BOT] Refreshing page`),
	Effect.flatMap(() => PageDep),
	Effect.flatMap((page) => Effect.promise(() => page.reload({ waitUntil: "networkidle2" }))),
	Effect.withSpan("refreshPage"),
)
