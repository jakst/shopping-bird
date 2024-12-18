import type { RouteDefinition } from "@solidjs/router"
import { createSignal, onCleanup, onMount } from "solid-js"
import { ClientOnly } from "~/components/ClientOnly"
import { Home } from "~/components/Home"
import { checkAuth } from "~/lib/auth"

export const route = {
	preload() {
		checkAuth()
	},
} satisfies RouteDefinition

export default function Shell() {
	const [mainElement, setMainElement] = createSignal<HTMLElement | null>(null)
	const [softwareKeyboardShown, setSoftwareKeyboardShown] = createSignal(false)

	onMount(() => {
		let prevHeight = window.visualViewport?.height ?? 0

		function handleResize() {
			const el = mainElement()
			if (el && window.visualViewport) {
				const newHeight = window.visualViewport.height
				el.style.height = `${newHeight.toString()}px`
				setSoftwareKeyboardShown(prevHeight > newHeight)
				prevHeight = newHeight
			}
		}

		window.visualViewport?.addEventListener("resize", handleResize)
		onCleanup(() => window.visualViewport?.removeEventListener("resize", handleResize))
	})

	return (
		<main ref={setMainElement} class="mx-auto text-color12 max-w-lg h-full flex flex-col">
			<div class="flex px-4 py-4 justify-between items-center content-center">
				<img src="/header-logo.svg" alt="Shopping bird logo containing a bird riding in a shopping cart" />
			</div>

			<ClientOnly>
				<Home softwareKeyboardShown={softwareKeyboardShown()} />
			</ClientOnly>
		</main>
	)
}
