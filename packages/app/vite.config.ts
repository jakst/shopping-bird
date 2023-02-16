import { config } from "dotenv"
import solidDevTools from "solid-devtools/vite"
import vercel from "solid-start-vercel"
import solid from "solid-start/vite"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { z } from "zod"

config()

const env = z
	.object({
		LOCAL_DEV: z.literal("1").optional(),
	})
	.transform(({ LOCAL_DEV, ...rest }) => ({
		...rest,
		isLocalDev: LOCAL_DEV === "1",
	}))
	.parse({
		LOCAL_DEV: process.env.LOCAL_DEV,
	})

export default defineConfig({
	plugins: [
		solidDevTools({
			autoname: true,
			locator: {
				targetIDE: "vscode",
				componentLocation: true,
				jsxLocation: true,
			},
		}),
		solid(env.isLocalDev ? {} : { adapter: vercel({ edge: true }) }),
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
					{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
				],
			},
		}),
	],
})
