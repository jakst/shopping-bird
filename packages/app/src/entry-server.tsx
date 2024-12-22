// @refresh reload
import { StartServer, createHandler } from "@solidjs/start/server"
import { Show } from "solid-js"

export default createHandler(() => (
	<StartServer
		document={({ assets, children, scripts }) => (
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<title>Shopping Bird</title>
					<meta name="description" content="Your shopping list" />

					<link rel="icon" type="image/png" href="/favicon.png" />
					<link rel="preload" href="/_build/Hubot-Sans-1.0.woff2" as="font" type="font/woff2" crossorigin="anonymous" />

					<Show when={import.meta.env.PROD}>
						<link rel="manifest" type="application/manifest+json" href="/manifest.webmanifest" />
					</Show>

					{assets}
				</head>

				<body class="bg-color1">
					<div id="app">{children}</div>
					{scripts}
				</body>
			</html>
		)}
	/>
))
