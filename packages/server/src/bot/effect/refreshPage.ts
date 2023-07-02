import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { goToShoppingListPage } from "../../bot/google-bot"
import { PageDep } from "./PageDep"

export const refreshPage = pipe(
	Effect.logDebug(`[BOT] Refreshing page`),
	Effect.flatMap(() => PageDep),
	Effect.flatMap((page) =>
		Effect.promise(async () => {
			await goToShoppingListPage(page)
		}),
	),
)
