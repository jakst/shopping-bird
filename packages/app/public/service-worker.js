console.log("[swrkr] HEY HEY!")

self.addEventListener("install", () => {
	console.log("[swrkr] Install!")
})

self.addEventListener("activate", (event) => {
	console.log("[swrkr] Activate!")
})

self.addEventListener("fetch", (event) => {
	console.log("[swrkr] Fetch!", event.request)
})
