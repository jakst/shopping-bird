// @ts-nocheck
import vercel from "solid-start-vercel"
import solid from "solid-start/vite"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	plugins: [
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				short_name: "Shopping Bird",
				name: "Shopping Bird",
				icons: [
					{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
				],
				start_url: "/",
				theme_color: "#0369a1",
				background_color: "#fff",
				display: "minimal-ui",
			},
		}),
		solid({ adapter: vercel({ edge: true }) }),
		Icons({ compiler: "solid", autoInstall: true }),
	],
})
