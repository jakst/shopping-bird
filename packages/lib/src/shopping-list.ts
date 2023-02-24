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
			const { id, fromPosition, toPosition } = event.data

			const activeList = list.filter(({ checked }) => !checked)

			list.forEach((item, index) => {
				const currentPosition = item.position ?? activeList.indexOf(item) ?? index

				if (item.id === id) {
					item.position = toPosition
				} else if (currentPosition > fromPosition && currentPosition <= toPosition) {
					item.position = currentPosition - 1
				} else if (currentPosition < fromPosition && currentPosition >= toPosition) {
					item.position = currentPosition + 1
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
