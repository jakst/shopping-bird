import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Layer from "@effect/io/Layer"
import * as Runtime from "@effect/io/Runtime"
import * as Scope from "@effect/io/Scope"

export const makeCustomRuntime = <E, A>(layer: Layer.Layer<never, E, A>) =>
	Effect.runPromise(
		Effect.gen(function* ($) {
			const scope = yield* $(Scope.make())
			const runtime = yield* $(Layer.toRuntime(layer), Scope.extend(scope))
			return {
				runPromise: Runtime.runPromise(runtime),
				close: () => Effect.runPromise(Scope.close(scope, Exit.unit())),
			}
		}),
	)
