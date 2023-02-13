import { getSession } from "@solid-auth/next"
import { Component, Show } from "solid-js"
import { useRouteData } from "solid-start"
import { createServerData$, redirect } from "solid-start/server"
import { authOptions } from "~/lib/authOptions"

export const ProtectedRoute = (ProtectedComponent: Component) => {
	const routeData = () => {
		return createServerData$(
			async (_, event) => {
				const session = await getSession(event.request, authOptions)
				if (!session || !session.user) throw redirect("/api/auth/signin?csrf=true")

				return session
			},
			{ key: "auth_user" },
		)
	}

	return {
		routeData,
		Page: () => {
			const session = useRouteData<typeof routeData>()

			return (
				<Show when={session()} keyed>
					<ProtectedComponent />
				</Show>
			)
		},
	}
}
