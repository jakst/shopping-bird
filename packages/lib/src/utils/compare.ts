import type { ShoppingListEvent, ShoppingListItem } from "../lib"

export function compare(oldList: ShoppingListItem[], newList: ShoppingListItem[]) {
	const events: ShoppingListEvent[] = []

	newList.forEach((newItem) => {
		const oldItem = oldList.find((oldItem) => oldItem.id === newItem.id)
		if (!oldItem) {
			events.push({
				name: "ADD_ITEM",
				data: { id: newItem.id, name: newItem.name },
			})
			events.push({
				name: "SET_ITEM_POSITION",
				data: { id: newItem.id, position: newItem.position },
			})
			if (newItem.checked)
				events.push({
					name: "SET_ITEM_CHECKED",
					data: { id: newItem.id, checked: true },
				})
		} else {
			if (newItem.position !== oldItem.position)
				events.push({
					name: "SET_ITEM_POSITION",
					data: { id: newItem.id, position: newItem.position },
				})
			if (newItem.checked !== oldItem.checked)
				events.push({
					name: "SET_ITEM_CHECKED",
					data: { id: newItem.id, checked: newItem.checked },
				})
			if (newItem.name !== oldItem.name)
				events.push({
					name: "RENAME_ITEM",
					data: { id: newItem.id, newName: newItem.name },
				})
		}
	})

	oldList.forEach((oldItem) => {
		const newItem = newList.find(({ id }) => id === oldItem.id)
		if (!newItem) events.push({ name: "DELETE_ITEM", data: { id: oldItem.id } })
	})

	return events
}
