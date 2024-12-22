import type { MergeableStore } from "tinybase"
import { createId } from "./create-id"
import type { ShoppingListItem } from "./schemas"

export function createTinybaseClient(tinybase: MergeableStore) {
	function updateTimestamp() {
		tinybase.setValue("lastChangedAt", new Date().toISOString())
	}

	function addItem(name: string, forcedId?: string) {
		const id = forcedId ?? createId()
		const position =
			Object.values(tinybase.getTable("items") as Record<string, ShoppingListItem>).reduce(
				(prev, curr) => Math.max(prev, curr.position),
				0,
			) + 1

		tinybase.setRow("items", id, { id, name, checked: false, position })

		updateTimestamp()
		return id
	}

	function removeItem(id: string) {
		tinybase.delRow("items", id)

		updateTimestamp()
	}

	function setItemChecked(id: string, checked: boolean) {
		tinybase.setPartialRow("items", id, { checked })

		updateTimestamp()
	}

	function renameItem(id: string, name: string) {
		tinybase.setPartialRow("items", id, { name })

		updateTimestamp()
	}

	function clearCheckedItems() {
		tinybase.transaction(() => {
			const items = Object.values(tinybase.getTable("items") as Record<string, ShoppingListItem>)
			items.filter((item) => item.checked).forEach(({ id }) => tinybase.delRow("items", id))
		})

		updateTimestamp()
	}

	function moveItem(id: string, { fromPosition, toPosition }: { fromPosition: number; toPosition: number }) {
		tinybase.transaction(() => {
			tinybase.setPartialRow("items", id, { position: toPosition })

			const items = Object.values(tinybase.getTable("items") as Record<string, ShoppingListItem>)
			items.forEach((item) => {
				if (item.id !== id) {
					if (item.position > fromPosition && item.position <= toPosition) {
						tinybase.setPartialRow("items", item.id, { position: item.position - 1 })
					} else if (item.position < fromPosition && item.position >= toPosition) {
						tinybase.setPartialRow("items", item.id, { position: item.position + 1 })
					}
				}
			})
		})

		updateTimestamp()
	}

	return { addItem, removeItem, setItemChecked, renameItem, clearCheckedItems, moveItem }
}
