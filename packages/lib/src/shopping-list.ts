import { type ShoppingListEvent, type ShoppingListItem } from "./schemas"

type OnChange = (list: ShoppingListItem[]) => void

export class ShoppingList {
	items: ShoppingListItem[]

	constructor(initialItems: ShoppingListItem[], private onChange: OnChange) {
		this.items = initialItems
	}

	replaceList(items: ShoppingListItem[]) {
		this.items = items
		this.onChange(this.items)
	}

	applyEvent(event: ShoppingListEvent) {
		const isValidEvent = validateEvent(this.items, event)

		if (isValidEvent) {
			applyEvent(this.items, event)
			this.onChange(this.items)
		}

		return isValidEvent
	}

	applyEvents(events: ShoppingListEvent[]) {
		const successfulEvents: ShoppingListEvent[] = []

		let somethingChanged = false
		events.forEach((event) => {
			// Must be applied directly, in case the next event relies on the results of this one
			if (validateEvent(this.items, event)) {
				somethingChanged = true
				applyEvent(this.items, event)
				successfulEvents.push(event)
			}
		})

		if (somethingChanged) this.onChange(this.items)
		return successfulEvents
	}
}

export function applyEvent(list: ShoppingListItem[], event: ShoppingListEvent) {
	switch (event.name) {
		case "ADD_ITEM": {
			list.push({ ...event.data, checked: false, position: list.length })
			break
		}

		case "DELETE_ITEM": {
			const itemIndex = list.findIndex((item) => item.id === event.data.id)
			if (itemIndex >= 0) list.splice(itemIndex, 1)
			break
		}

		case "SET_ITEM_CHECKED": {
			const item = list.find((item) => item.id === event.data.id)
			if (item) item.checked = event.data.checked
			break
		}

		case "RENAME_ITEM": {
			const item = list.find((item) => item.id === event.data.id)
			if (item) item.name = event.data.newName
			break
		}

		case "MOVE_ITEM": {
			const { id, fromIndex, toIndex } = event.data
			list.forEach((item) => {
				const currentPosition = item.position ?? -1

				if (item.id === id) {
					item.position = toIndex
				} else if (typeof item.position === "number" && currentPosition > fromIndex && currentPosition <= toIndex) {
					item.position--
				} else if (typeof item.position === "number" && currentPosition < fromIndex && currentPosition >= toIndex) {
					item.position++
				}
			})
			break
		}
	}
}

export function validateEvent(list: ShoppingListItem[], event: ShoppingListEvent): boolean {
	switch (event.name) {
		case "ADD_ITEM":
			return !list.some(({ id }) => event.data.id === id)

		case "DELETE_ITEM":
		case "SET_ITEM_CHECKED":
		case "RENAME_ITEM":
		case "MOVE_ITEM":
			return list.some(({ id }) => event.data.id === id)
	}
}
