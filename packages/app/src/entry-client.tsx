import { mount, StartClient } from "solid-start/entry-client"

let deferredPrompt: Event | null = null

//reference to your install button

//We hide the button initially because the PWA will not be available for
//install until it follows the A2HS criteria.
// addBtn.style.display = 'none';

let onClick: (event: Event) => void

window.addEventListener("beforeinstallprompt", (e) => {
	console.log("[swrkr] beforeInstall")
	// Prevent Chrome 67 and earlier from automatically showing the prompt
	e.preventDefault()
	// Stash the event so it can be triggered later.
	deferredPrompt = e
	// Update UI to notify the user they can add to home screen
	// addBtn.style.display = 'block';

	onClick = (e) => {
		// hide our user interface that shows our A2HS button
		// addBtn.style.display = "none"
		// Show the prompt
		deferredPrompt.prompt()
		// Wait for the user to respond to the prompt
		deferredPrompt.userChoice.then((choiceResult) => {
			if (choiceResult.outcome === "accepted") {
				console.log("User accepted the A2HS prompt")
			} else {
				console.log("User dismissed the A2HS prompt")
			}
			deferredPrompt = null
		})
	}
})

mount(
	() => (
		<>
			<StartClient />
			<button onClick={onClick}>Derp</button>
		</>
	),
	document,
)

if ("serviceWorker" in navigator) {
	console.log("[swrkr] supported")
	navigator.serviceWorker
		.register("service-worker.js")
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
