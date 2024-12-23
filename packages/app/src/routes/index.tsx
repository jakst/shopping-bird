import type { RouteDefinition } from "@solidjs/router"
import { ClientOnly } from "~/components/ClientOnly"
import { Home } from "~/components/Home"
import { checkAuth } from "~/lib/auth"

export const route = {
	preload() {
		checkAuth()
	},
} satisfies RouteDefinition

export default function Shell() {
	return (
		<main class="mx-auto text-color12 max-w-lg h-full flex flex-col">
			<div class="flex px-4 py-4 justify-between items-center content-center">
				<img src="/header-logo.svg" alt="Shopping bird logo containing a bird riding in a shopping cart" />
			</div>

			<ClientOnly>
				<Home />
			</ClientOnly>
		</main>
	)
}
