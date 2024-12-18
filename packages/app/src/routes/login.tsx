import { type RouteDefinition, type RouteSectionProps, useSubmission } from "@solidjs/router"
import { Show } from "solid-js"
import { checkAuth, login } from "~/lib/auth"

export const route = {
	preload() {
		checkAuth()
	},
} satisfies RouteDefinition

export default function Login(props: RouteSectionProps) {
	const loggingIn = useSubmission(login)

	return (
		<main class="p-8 flex justify-center items-center h-full">
			<form action={login} method="post" class="bg-color4 rounded-lg p-4 flex flex-col gap-4">
				<div>
					<label for="username-input" class="block">
						Username
					</label>
					<input name="username" class="bg-color2 p-1 rounded-sm" />
				</div>

				<div>
					<label for="password-input" class="block">
						Password
					</label>
					<input name="password" type="password" class="bg-color2 p-1 rounded-sm" />
				</div>

				<Show when={loggingIn.result}>
					<p role="alert" class="text-red9">
						{loggingIn.result!.message}
					</p>
				</Show>

				<button type="submit" class="self-end">
					Login
				</button>
			</form>
		</main>
	)
}
