import { StartClient, mount } from "solid-start/entry-client"
import { registerSW } from "virtual:pwa-register"

if ("serviceWorker" in navigator) registerSW()

mount(() => <StartClient />, document)
