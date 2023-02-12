// @ts-nocheck
import vercel from "solid-start-vercel"
import solid from "solid-start/vite"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	plugins: [
		solid({ adapter: vercel({ edge: true }) }),
		Icons({ compiler: "solid", autoInstall: true }),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "Bird",
				short_name: "Shopping Bird",
				description: "Your shopping list",
				start_url: "/",
				display: "minimal-ui",
				theme_color: "#0369a1",
				background_color: "#fff",
				icons: [
					{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
				],
			},
		}),
	],
})
