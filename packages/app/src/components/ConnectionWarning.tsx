import { useConnectivitySignal } from "@solid-primitives/connectivity"
import { usePageVisibility } from "@solid-primitives/page-visibility"
import { ErrorBoundary, Show, createEffect, createResource, onCleanup, startTransition } from "solid-js"
import { env } from "~/lib/env"

export function ConnectionWarning() {
	const isOnline = useConnectivitySignal()

	return (
		<Show when={isOnline()} fallback={<Offline />}>
			{/* TODO: Add some mechanism other than refreshing to recover from this. */}
			<ErrorBoundary fallback={<ConnectionError />}>
				<ConnectionStatus />
			</ErrorBoundary>
		</Show>
	)
}

function ConnectionStatus() {
	const [showAuthWarning, { refetch }] = createResource(
		async () => {
			const req = await fetch(env.BACKEND_URL)
			const res = (await req.json()) as { commit: string; authenticated: boolean }

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

function ConnectionError() {
	return (
		<div
			class="mx-2 mb-4 bg-red-100 border border-red-400 text-sm text-red-700 px-4 py-3 rounded relative"
			role="alert"
		>
			<strong class="font-bold">Connection error!</strong>
			<span class="block">Your changes will be synced when the server is back up again.</span>
		</div>
	)
}

function NoAuth() {
	return (
		<div
			class="mx-2 mb-4 bg-yellow-100 border border-yellow-400 text-sm text-yellow-700 px-4 py-3 rounded relative"
			role="alert"
		>
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
				class="bg-gray-50 border border-gray-300 text-gray-500 px-2 py-1 rounded text-xs font-semibold"
				role="alert"
			>
				Working offline
			</span>
		</div>
	)
}
