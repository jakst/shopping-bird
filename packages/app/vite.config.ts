// @ts-nocheck
import vercel from "solid-start-vercel"
import solid from "solid-start/vite"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	plugins: [
		VitePWA({ registerType: "autoUpdate" }),
		solid({ adapter: vercel({ edge: true }) }),
		Icons({ compiler: "solid", autoInstall: true }),
	],
})
