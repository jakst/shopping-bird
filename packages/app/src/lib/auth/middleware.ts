import { FetchEvent } from "solid-start"
import { MiddlewareInput } from "solid-start/entry-server"

export function createAuthMiddleware(protectedPaths: string[]) {
	return ({ forward }: MiddlewareInput) =>
		async (event: FetchEvent) => {
			return forward(event)
		}
}
