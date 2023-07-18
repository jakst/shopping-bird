import { useConnectivitySignal } from "@solid-primitives/connectivity"
import { usePageVisibility } from "@solid-primitives/page-visibility"
import { ErrorBoundary, Show, createEffect, createResource, onCleanup, startTransition } from "solid-js"
import { z } from "zod"
import { env } from "~/lib/env"

export function ConnectionWarning() {
	const isOnline = useConnectivitySignal()

	return (
		<Show when={isOnline()} fallback={<Offline />}>
			{/* TODO: Add some mechanism other than refreshing to recover from this. */}
			<ErrorBoundary fallback={<NoConnection />}>
				<ConnectionStatus />
			</ErrorBoundary>
		</Show>
	)
}

function ConnectionStatus() {
	const [showAuthWarning, { refetch }] = createResource(
		async () => {
			const req = await fetch(env.BACKEND_URL)
			const res = z.object({ authenticated: z.boolean() }).parse(await req.json())

			return !res.authenticated
		},
		{ initialValue: true },
	)

	function poll() {
		startTransition(refetch)
	}

	createEffect(() => {
		if (usePageVisibility()) {
			poll()

			// Refetch infrequently when we're not showing a warning
			// and increase aggressiveness when the warning is up
			// to make sure we remove it quickly when everything is
			// back to normal.
			const refetchInterval = showAuthWarning() ? 3_000 : 30_000

			const interval = setInterval(poll, refetchInterval)
			onCleanup(() => clearInterval(interval))
		}
	})

	return (
		<Show when={showAuthWarning()}>
			<NoAuth />
		</Show>
	)
}

function NoConnection() {
	return (
		<div class="mx-2 mb-4 bg-red2 border border-red6 text-sm text-red9 px-4 py-3 rounded relative" role="alert">
			<strong class="font-bold">Connection error!</strong>
			<span class="block">Your changes will be synced when the server is back up again.</span>
		</div>
	)
}

function NoAuth() {
	return (
		<div class="mx-2 mb-4 bg-amber2 border border-amber7 text-sm text-amber11 px-4 py-3 rounded relative" role="alert">
			<strong class="font-bold">Whoppa!</strong>
			<span class="block">
				Looks like the server has lost its authentication info. Contact your system admin to re-authenticate.
			</span>
		</div>
	)
}

function Offline() {
	return (
		<div class="flex justify-end mx-2 mb-4">
			<span
				class="bg-color2 border border-color8 text-color10 px-2 pt-1 pb-[2px] rounded text-xs font-semibold"
				role="alert"
			>
				Working offline
			</span>
		</div>
	)
}
