import { Component, Show } from "solid-js"
import { useRouteData } from "solid-start"
import { createServerData$, redirect } from "solid-start/server"
import { authenticator } from "~/lib/auth/authenticator"

export const ProtectedRoute = (ProtectedComponent: Component) => {
	const routeData = () => {
		return createServerData$(
			async (_, event) => {
				const user = await authenticator.isAuthenticated(event.request)
				if (!user) throw redirect("/login")

				return user
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
