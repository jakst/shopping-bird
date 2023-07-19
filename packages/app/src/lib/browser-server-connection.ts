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

	get isConnected() {
		return this.clientId !== null
	}

	constructor(private onConnectionStatusChanged: (connected: boolean) => void) {}

	#onConnectionClosed() {
		this.clientId = null
		this.onConnectionStatusChanged(false)

		if (this.#reconnectionInterval) clearInterval(this.#reconnectionInterval)
		this.#reconnectionInterval = setInterval(() => void this.connect(), 1000)
	}

	async connect() {
		if (this.isConnected) return

		const ws = (this.ws = new WebSocket(env.WS_URL))

		ws.onopen = () => {
			clearInterval(this.#reconnectionInterval!)
		}

		return new Promise<void>((resolve) => {
			const listUpdateListener = (event: MessageEvent<string>) => {
				const data = updateMessageSchema.parse(JSON.parse(event.data))
				this.clientId = data.clientId
				this.onListUpdate?.(data)

				this.onConnectionStatusChanged(true)
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
			return responseMessageSchema.parse(body).shoppingList
		} else {
			throw new Error(`Pushing events failed: ${response}`)
		}
	}
}
