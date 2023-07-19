import { type ClientServerConnection } from "./client-server-connection"
import { createId } from "./create-id"
import { EventQueue } from "./event-queue"
import { type ShoppingListEvent, type ShoppingListItem } from "./schemas"
import { ShoppingList, validateEvent } from "./shopping-list"
import { compare } from "./utils/compare"

interface ClientDeps {
	shoppingList: ShoppingList
	remoteShoppingListCopy: ShoppingList
	serverConnection: ClientServerConnection
	eventQueue: EventQueue<ShoppingListEvent>
}

export class Client {
	#promise: Promise<any> | null = null
	#pendingUpdates = false

	constructor(private $d: ClientDeps) {
		this.#pendingUpdates = !$d.eventQueue.isEmpty()
		$d.serverConnection.onListUpdate = ({ shoppingList }) => {
			// Don't accept any external updates as long as we still have unsent updates ourselves
			if (!this.#pendingUpdates) this.onRemoteListChanged(shoppingList)
		}
	}

	async connect() {
		if (this.$d.serverConnection.isConnected) return

		await this.$d.serverConnection.connect()
		await this.flushEvents()
	}

	async flushEvents() {
		this.#promise ??= this.#flushEvents().then(() => (this.#promise = null))
		await this.#promise
	}

	async #flushEvents() {
		if (this.$d.serverConnection.isConnected && !this.$d.eventQueue.isEmpty()) {
			await this.$d.eventQueue.process(async (events) => {
				const newList = await this.$d.serverConnection.pushEvents(events)
				this.onRemoteListChanged(newList)
			})

			this.#pendingUpdates = false
		}
	}

	async applyEvent(event: ShoppingListEvent, flush = true) {
		if (!validateEvent(this.$d.shoppingList.items, event)) return

		// Apply event to local and remote shoppingList
		this.$d.shoppingList.applyEvent(event)
		this.$d.remoteShoppingListCopy.applyEvent(event)

		// Queue event for remote push
		this.$d.eventQueue.push(event)
		this.#pendingUpdates = true

		// Flush to server
		if (flush) await this.flushEvents()
	}

	onRemoteListChanged(newList: ShoppingListItem[]) {
		// Diff remote list against last version to get events
		const diffedEvents = compare(this.$d.remoteShoppingListCopy.items, newList)

		if (diffedEvents.length > 0) {
			// Apply events to local and replace remote shoppingList
			this.$d.shoppingList.applyEvents(diffedEvents)
			this.$d.remoteShoppingListCopy.replaceList(newList)
		}
	}

	async addItem(name: string) {
		const id = createId()
		await this.applyEvent({ name: "ADD_ITEM", data: { id, name } })

		return id
	}

	async deleteItem(id: string) {
		await this.applyEvent({ name: "DELETE_ITEM", data: { id } })
	}

	async setItemChecked(id: string, checked: boolean) {
		await this.applyEvent({ name: "SET_ITEM_CHECKED", data: { id, checked } })
	}

	async renameItem(id: string, newName: string) {
		await this.applyEvent({ name: "RENAME_ITEM", data: { id, newName } })
	}

	async moveItem(id: string, options: { fromPosition: number; toPosition: number }) {
		await this.applyEvent({ name: "MOVE_ITEM", data: { id, ...options } })
	}

	async clearCheckedItems() {
		const checkedItems = this.$d.shoppingList.items.filter(({ checked }) => checked)

		for (const { id } of checkedItems) {
			const event: ShoppingListEvent = { name: "DELETE_ITEM", data: { id } }
			// Skip flushing for every event
			await this.applyEvent(event, false)
		}

		// Flush here instead
		await this.flushEvents()

		return checkedItems.map(({ id }) => id)
	}
}
