import { useConnectivitySignal } from "@solid-primitives/connectivity"
import { Match, Switch } from "solid-js"

export function ConnectionWarning(props: { isAuthenticated: boolean; isConnected: boolean }) {
	const isOnline = useConnectivitySignal()

	const showOfflineWarning = () => !isOnline()
	const showNotConnectedWarning = () => isOnline() && !props.isConnected
	const showAuthWarning = () => isOnline() && props.isConnected && !props.isAuthenticated

	return (
		<Switch>
			<Match when={showOfflineWarning()}>
				<div class="flex justify-end mx-2 mb-4">
					<span
						class="bg-color2 border border-color8 text-color10 px-2 pt-1 pb-[2px] rounded text-xs font-semibold"
						role="alert"
					>
						Working offline
					</span>
				</div>
			</Match>

			<Match when={showNotConnectedWarning()}>
				<div class="mx-2 mb-4 bg-red2 border border-red6 text-sm text-red9 px-4 py-3 rounded relative" role="alert">
					<strong class="font-bold">Connection error!</strong>
					<span class="block">Your changes will be synced when the server is back up again.</span>
				</div>
			</Match>

			<Match when={showAuthWarning()}>
				<div
					class="mx-2 mb-4 bg-amber2 border border-amber7 text-sm text-amber11 px-4 py-3 rounded relative"
					role="alert"
				>
					<strong class="font-bold">Whoppa!</strong>
					<span class="block">
						Looks like the server has lost its authentication info. Contact your system admin to re-authenticate.
					</span>
				</div>
			</Match>
		</Switch>
	)
}
