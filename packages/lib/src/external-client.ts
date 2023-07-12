import { createId } from "./create-id"
import { type ShoppingListEvent, type ShoppingListItem } from "./schemas"
import { applyEvent } from "./shopping-list"
import { equalsList } from "./utils/equals-list"

interface ExternalClientDeps {
	initialStore: ShoppingListItem[]
	onStoreChanged(store: ShoppingListItem[]): Promise<void>
	bot: Bot
}

export interface ExternalListItem {
	name: string
	checked: boolean
}

export class ExternalClient {
	onEventsReturned: null | ((events: ShoppingListEvent[]) => Promise<void>) = null

	/** Containst the resulting store, with mapped IDs, from the last sync */
	#previousStore: ShoppingListItem[]

	/** Contains the incoming store, that we aim to converge with */
	#incomingStore: ShoppingListItem[] | null = null

	#promise: Promise<any> | null = null

	constructor(private $d: ExternalClientDeps) {
		this.#previousStore = $d.initialStore
		this.#incomingStore = $d.initialStore
	}

	async flush() {
		await this.#promiseToSync()
	}

	async sync(shoppingList: ShoppingListItem[]) {
		// Deep clone, so we don't accidentally mutate
		this.#incomingStore = structuredClone(shoppingList)
		await this.#promiseToSync()
	}

	async #promiseToSync() {
		this.#promise ??= this.#sync().then(() => (this.#promise = null))
		await this.#promise
	}

	async #sync() {
		if (!this.#incomingStore) return

		const workingStoreCopy = structuredClone(this.#incomingStore)
		this.#incomingStore = null

		await this.$d.bot.refreshList()
		let latestListFromBot = await this.$d.bot.getList()

		const eventsToReturn = generateEvents(latestListFromBot, this.#previousStore)
		if (eventsToReturn.length > 0) {
			await this.onEventsReturned?.(eventsToReturn)
			eventsToReturn.forEach((event) => applyEvent(workingStoreCopy, event))
		}

		this.$d.onStoreChanged(workingStoreCopy)
		this.#previousStore = workingStoreCopy

		while (!equalsList(workingStoreCopy, latestListFromBot)) {
			const mappedItems = new Set()

			for (const incomingItem of workingStoreCopy) {
				let clientItem = latestListFromBot.find(
					(i) => i.name === incomingItem.name && i.checked === incomingItem.checked && !mappedItems.has(i),
				)

				// If no item with the same checked value matched, try to match on name only
				if (!clientItem) clientItem = latestListFromBot.find((i) => i.name === incomingItem.name && !mappedItems.has(i))

				if (clientItem) {
					mappedItems.add(incomingItem)
					mappedItems.add(clientItem)

					if (clientItem.checked !== incomingItem.checked) {
						await this.$d.bot.SET_ITEM_CHECKED(clientItem.index, incomingItem.checked)
					}
				}
			}

			// Start with the last item and go upwards, so we don't
			// change the index of the next item to be deleted.
			const unmappedFromClientList = latestListFromBot
				.filter((i) => !mappedItems.has(i))
				.sort((a, b) => b.index - a.index)

			for (const item of unmappedFromClientList) {
				await this.$d.bot.DELETE_ITEM(item.index)
			}

			const unmappedFromIncomingList = workingStoreCopy.filter((i) => !mappedItems.has(i))

			// Add items that weren't mapped
			for (const item of unmappedFromIncomingList) {
				await this.$d.bot.ADD_ITEM(item.name, item.checked)
			}

			latestListFromBot = await this.$d.bot.getList()
		}

		await this.#sync()
	}
}

function generateEvents(list: readonly ExternalListItem[], previousStore: readonly ShoppingListItem[]) {
	const generatedEvents: ShoppingListEvent[] = []

	list.forEach((newItem) => {
		const itemFromBefore = previousStore.find(({ name }) => name === newItem.name)

		if (!itemFromBefore) {
			const id = createId()
			generatedEvents.push({
				name: "ADD_ITEM",
				data: { id, name: newItem.name },
			})

			if (newItem.checked) {
				generatedEvents.push({
					name: "SET_ITEM_CHECKED",
					data: { id, checked: true },
				})
			}
		} else if (itemFromBefore.checked !== newItem.checked) {
			generatedEvents.push({
				name: "SET_ITEM_CHECKED",
				data: { id: itemFromBefore.id, checked: newItem.checked },
			})
		}
	})

	previousStore.forEach((olditem) => {
		const currentItem = list.find(({ name }) => name === olditem.name)
		if (!currentItem) generatedEvents.push({ name: "DELETE_ITEM", data: { id: olditem.id } })
	})

	return generatedEvents
}

export interface Bot {
	refreshList(): Promise<void>
	getList(): Promise<(ExternalListItem & { index: number })[]>
	ADD_ITEM(name: string, checked?: boolean): Promise<void>
	DELETE_ITEM(index: number): Promise<void>
	SET_ITEM_CHECKED(index: number, checked: boolean): Promise<void>
}
