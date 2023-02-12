import { mount, StartClient } from "solid-start/entry-client"

mount(() => <StartClient />, document)

if ("serviceWorker" in navigator) {
	console.log("[swrkr] supported")
	navigator.serviceWorker
		.register("service-worker.js", { scope: "./" })
		.then(
			(registration) => {
				// Registration was successful
				console.log("[swrkr] registered")
			},
			function (err) {
				// registration failed :(
				console.log("[swrkr] ServiceWorker registration failed: ", err)
			},
		)
		.catch((err) => {
			console.log(err)
		})
} else {
	console.log("[swrkr] not supported")
}
