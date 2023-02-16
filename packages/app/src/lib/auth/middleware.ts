import { getSession } from "@auth/solid-start"
import { redirect, type FetchEvent } from "solid-start"
import { type MiddlewareInput } from "solid-start/entry-server"
import { authOptions } from "./options"

export function createAuthMiddleware(protectedPaths: string[]) {
	return ({ forward }: MiddlewareInput) =>
		async (event: FetchEvent) => {
			if (protectedPaths.includes(new URL(event.request.url).pathname)) {
				const session = await getSession(event.request, authOptions)
				if (!session) return redirect("/api/auth/signin?csrf=true")
			}

			return forward(event)
		}
}
