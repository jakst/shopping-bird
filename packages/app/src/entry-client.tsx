import { useLocator } from "solid-devtools"
import { mount, StartClient } from "solid-start/entry-client"
import { registerSW } from "virtual:pwa-register"

if ("serviceWorker" in navigator) registerSW()

useLocator({ targetIDE: "vscode" })

mount(() => <StartClient />, document)
