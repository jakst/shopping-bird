import { createSignal, JSX, onMount, Show } from "solid-js"

export function ClientOnly(props: { children: JSX.Element }) {
	const [isMounted, setIsMounted] = createSignal(false)

	onMount(() => setIsMounted(true))

	return <Show when={isMounted()}>{props.children}</Show>
}
