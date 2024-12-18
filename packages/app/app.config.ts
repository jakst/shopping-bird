import { defineConfig } from "@solidjs/start/config"
import Icons from "unplugin-icons/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	vite: {
		plugins: [
			Icons({ compiler: "solid", autoInstall: true }),
			VitePWA({
				registerType: "autoUpdate",
				workbox: {
					globPatterns: ["**/*.{js,css,woff2,png,svg}"],
					navigateFallback: null,
					runtimeCaching: [
						{
							urlPattern: ({ url }) => url.pathname === "/",
							handler: "StaleWhileRevalidate",
						},
					],
				},
				manifest: {
					name: "Shopping Bird",
					short_name: "Shopping Bird",
					description: "Your shopping list",
					start_url: "/",
					theme_color: "#0369a1",
					background_color: "#fff",
					icons: [
						{ src: "/icon-x192.png", sizes: "192x192", type: "image/png" },
						{ src: "/icon-x512.png", sizes: "512x512", type: "image/png" },
						{ src: "/maskable-icon-x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
						{ src: "/maskable-icon-x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
					],
				},
			}),
		],
	},
})
