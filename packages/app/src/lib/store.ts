import type { ShoppingListItem } from "lib"
import { createId } from "lib/src/create-id"
import { createStore, reconcile } from "solid-js/store"
import { isServer } from "solid-js/web"
import { createStore as createTinybaseStore } from "tinybase"
import { type LocalPersister, createLocalPersister } from "tinybase/persisters/persister-browser"

type TinyBaseItem = [id: string, item: ShoppingListItem]

export const [myShoppingList, setShoppingList] = createStore<TinyBaseItem[]>([])

const tinybase = createTinybaseStore()

let persister: LocalPersister

if (!isServer) {
	persister = createLocalPersister(tinybase, "shopping-list")
	persister.load()
}

tinybase.addTableListener("items", (store, tableId) => {
	const table = store.getTable(tableId) as Record<string, ShoppingListItem>
	setShoppingList(reconcile(Object.entries(table), { key: "0" }))

	persister?.save().catch(console.error)
})

export function addItem(name: string) {
	const position =
		Object.entries(tinybase.getTable("items") as Record<string, ShoppingListItem>).reduce(
			(prev, [, curr]) => Math.max(prev, curr.position),
			0,
		) + 1

	tinybase.addRow("items", { id: createId(), name, checked: false, position })
}

export function deleteItem(id: string) {
	tinybase.delRow("items", id)
}

export function setItemChecked(id: string, checked: boolean) {
	tinybase.setPartialRow("items", id, { checked })
}

export function renameItem(id: string, name: string) {
	tinybase.setPartialRow("items", id, { name })
}

export function clearCheckedItems() {
	tinybase.transaction(() => {
		const itemEntries = Object.entries(tinybase.getTable("items") as Record<string, ShoppingListItem>)
		itemEntries.filter(([, item]) => item.checked).forEach(([id]) => tinybase.delRow("items", id))
	})
}

export function moveItem(id: string, { fromPosition, toPosition }: { fromPosition: number; toPosition: number }) {
	tinybase.transaction(() => {
		tinybase.setPartialRow("items", id, { position: toPosition })

		const itemEntries = Object.entries(tinybase.getTable("items") as Record<string, ShoppingListItem>)
		itemEntries.forEach(([itemId, item]) => {
			if (itemId !== id) {
				if (item.position > fromPosition && item.position <= toPosition) {
					tinybase.setPartialRow("items", itemId, { position: item.position - 1 })
				} else if (item.position < fromPosition && item.position >= toPosition) {
					tinybase.setPartialRow("items", itemId, { position: item.position + 1 })
				}
			}
		})
	})
}
