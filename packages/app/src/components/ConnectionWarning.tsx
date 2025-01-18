import { useConnectivitySignal } from "@solid-primitives/connectivity"
import { Match, Show, Switch } from "solid-js"
import { failedToConnect } from "~/lib/shopping-list"

export function ConnectionWarning() {
	const isOnline = useConnectivitySignal()

	const showOfflineWarning = () => !isOnline()
	const showNotConnectedWarning = () => isOnline() && failedToConnect()

	return (
		<Show when={showOfflineWarning() || showNotConnectedWarning()}>
			<div class="flex justify-end -mt-6 mx-4">
				<Switch>
					<Match when={showOfflineWarning()}>
						<span
							class="bg-color2 border border-color8 text-color10 px-2 pt-1 pb-[2px] rounded text-xs font-semibold"
							role="alert"
						>
							Working offline
						</span>
					</Match>

					<Match when={showNotConnectedWarning()}>
						<span
							class="bg-red2 border border-red6 text-red9 px-2 pt-1 pb-[2px] rounded text-xs font-semibold"
							role="alert"
						>
							Connection error
						</span>
					</Match>
				</Switch>
			</div>
		</Show>
	)
}
