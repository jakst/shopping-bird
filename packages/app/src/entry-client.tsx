// @refresh reload

import { registerSW } from "virtual:pwa-register"
import { StartClient, mount } from "@solidjs/start/client"

if ("serviceWorker" in navigator) registerSW()

mount(() => <StartClient />, document.getElementById("app")!)
