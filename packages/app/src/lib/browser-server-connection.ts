import {
	responseMessageSchema,
	updateMessageSchema,
	type ClientServerConnection,
	type EventsMessage,
	type OnListUpdateCallback,
	type ShoppingListEvent,
} from "lib"
import { env } from "./env"

export class BrowserServerConnection implements ClientServerConnection {
	clientId: string | null = null
	ws: WebSocket | null = null
	onListUpdate: OnListUpdateCallback | null = null
	#reconnectionInterval: ReturnType<typeof setInterval> | null = null
	#resetConnectionInterval: ReturnType<typeof setInterval> | null = null

	get isConnected() {
		return this.clientId !== null
	}

	constructor(private onConnectionStatusChanged: (status: { authenticated: boolean; connected: boolean }) => void) {}

	#onConnectionClosed() {
		this.clientId = null
		this.onConnectionStatusChanged({ authenticated: true, connected: false })

		if (this.#reconnectionInterval) clearInterval(this.#reconnectionInterval)
		this.#reconnectionInterval = setInterval(() => void this.connect(), 1000)
	}

	async connect() {
		if (this.isConnected) return

		const ws = (this.ws = new WebSocket(env.WS_URL))

		if (!this.#resetConnectionInterval)
			// Reset connection every 60s to avoid suspect connection drops
			this.#resetConnectionInterval = setInterval(() => {
				console.log("Resetting connection")
				ws.close()
				this.clientId = null
				this.connect()
			}, 1000 * 60)

		ws.onopen = () => {
			clearInterval(this.#reconnectionInterval!)
		}

		return new Promise<void>((resolve) => {
			const listUpdateListener = (event: MessageEvent<string>) => {
				const data = updateMessageSchema.parse(JSON.parse(event.data))
				this.clientId = data.clientId
				this.onListUpdate?.(data)

				this.onConnectionStatusChanged({
					authenticated: data.authenticated,
					connected: true,
				})

				resolve()
			}

			ws.onmessage = listUpdateListener
			ws.onerror = () => this.#onConnectionClosed()
			ws.onclose = () => this.#onConnectionClosed()
		})
	}

	disconnect() {
		this.ws?.close()
		this.#onConnectionClosed()

		if (this.#resetConnectionInterval) clearInterval(this.#resetConnectionInterval)
	}

	async pushEvents(events: ShoppingListEvent[]) {
		if (!this.clientId) throw new Error("Not connected to server")

		const response = await fetch(`${env.BACKEND_URL}/events`, {
			method: "POST",
			body: JSON.stringify({
				clientId: this.clientId,
				events,
			} satisfies EventsMessage),
		})

		if (response.ok) {
			const body = await response.json()
			const { authenticated, shoppingList } = responseMessageSchema.parse(body)

			this.onConnectionStatusChanged({
				authenticated,
				connected: this.isConnected,
			})

			return shoppingList
		} else {
			throw new Error(`Pushing events failed: ${response}`)
		}
	}
}
