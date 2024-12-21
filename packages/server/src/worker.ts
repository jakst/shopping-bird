import { type ShoppingListItem, createTinybaseClient } from "lib"
import { type Id, type IdAddedOrRemoved, createMergeableStore } from "tinybase"
import { createDurableObjectStoragePersister } from "tinybase/persisters/persister-durable-object-storage"
import {
	WsServerDurableObject,
	getWsServerDurableObjectFetch,
} from "tinybase/synchronizers/synchronizer-ws-server-durable-object"
import type { Env } from "./Env"
import { GoogleKeepBot } from "./google-keep-bot"

const SYNC_INTERVAL = 5_000

export class TinyObject extends WsServerDurableObject<Env> {
	tinybaseStore = createMergeableStore()

	shoppingList = createTinybaseClient(this.tinybaseStore)

	interval: ReturnType<typeof setInterval> | undefined

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)

		this.tinybaseStore.addTableListener("items", (store, tableId) => {
			console.log(
				"OLA!",
				Object.fromEntries(Object.values(store.getTable(tableId)).map((item) => [item.id, item.name])),
			)
		})
	}

	onPathId(pathId: Id, addedOrRemoved: IdAddedOrRemoved) {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}

		if (addedOrRemoved > 0) {
			this.interval = setInterval(() => this.sync(), SYNC_INTERVAL)
			this.sync()
		}
	}

	createPersister() {
		return createDurableObjectStoragePersister(this.tinybaseStore, this.ctx.storage)
	}

	async sync() {
		console.log(this.tinybaseStore.getValue("lastChangedAt"))

		// if (Math.random() > 0) return

		const keepBot = new GoogleKeepBot(this.env.KEEP_SHOPPING_LIST_ID)
		await keepBot.authenticate({ email: this.env.KEEP_EMAIL, masterKey: this.env.KEEP_MASTER_KEY })

		type DiffItem = {
			id: string
			name: string
			checked: boolean
		}

		type DiffStore = {
			lastChangedAt: string
			items: DiffItem[]
		}

		const prevKeepStore = (await this.ctx.storage.get<DiffStore>("keep-list")) ?? { lastChangedAt: "", items: [] }
		const newKeepList = await keepBot.getList2()

		// If changes have been made in Keep since last time we checked, sync them back to the server.
		if (newKeepList.lastChangedAt !== prevKeepStore.lastChangedAt) {
			console.log("Keep list changed. Investigating...", newKeepList.lastChangedAt, prevKeepStore.lastChangedAt)

			const oldIds = new Set(prevKeepStore.items.map((item) => item.id))
			const newIds = new Set(newKeepList.items.map((item) => item.id))
			const removedIds = oldIds.difference(newIds)

			removedIds.forEach((id) => {
				this.shoppingList.deleteItem(id)
			})

			const newItems: DiffItem[] = []

			newKeepList.items.forEach((newKeepItem) => {
				const existingServerItem = this.tinybaseStore.getRow("items", newKeepItem.id) as ShoppingListItem

				if (existingServerItem) {
					const previousKeepItem = prevKeepStore.items.find((prevKeepItem) => prevKeepItem.id === newKeepItem.id)

					if (previousKeepItem) {
						if (newKeepItem.name !== previousKeepItem.name) {
							this.shoppingList.renameItem(existingServerItem.id, newKeepItem.name)
						}

						if (newKeepItem.checked !== previousKeepItem.checked) {
							this.shoppingList.setItemChecked(existingServerItem.id, newKeepItem.checked)
						}
					}
				} else {
					this.shoppingList.addItem(newKeepItem.name, newKeepItem.id)
					if (newKeepItem.checked) this.shoppingList.setItemChecked(newKeepItem.id, true)
				}
			})

			await this.ctx.storage.put<DiffStore>("keep-list", {
				lastChangedAt: newKeepList.lastChangedAt,
				items: newItems,
			})
		} else {
			type ServerStore = {
				lastChangedAt: string
				items: ShoppingListItem[]
			}

			const prevServerStore = (await this.ctx.storage.get<ServerStore>("server-list")) ?? {
				lastChangedAt: "",
				items: [],
			}
			const serverLastChangedAt = this.tinybaseStore.getValue("lastChangedAt") as string
			const serverRecord = this.tinybaseStore.getTable("items") as Record<string, ShoppingListItem>
			const serverList = Object.values(serverRecord)

			// If changes have been made on the server since last time we checked, sync them back to Keep.
			if (prevServerStore.lastChangedAt !== serverLastChangedAt) {
				const oldIds = new Set(prevServerStore.items.map((item) => item.id))
				const newIds = new Set(serverList.map((item) => item.id))
				const removedIds = oldIds.difference(newIds)

				removedIds.forEach((id) => {
					keepBot.deleteItem(id).catch((error) => {
						console.error(error)
					})
				})

				serverList.forEach((serverItem) => {
					const keepItem = newKeepList.items.find((keepItem) => keepItem.id === serverItem.id)
					console.log("\n\n", newKeepList)
					console.log(serverItem, keepItem, "\n\n")

					if (keepItem) {
						const previousServerItem = prevServerStore.items.find((item) => item.id === serverItem.id)

						if (previousServerItem) {
							let changed = false
							const updatedItem: { name?: string; checked?: boolean } = {}
							if (previousServerItem.name !== serverItem.name) {
								changed = true
								updatedItem.name = serverItem.name
							}
							if (previousServerItem.checked !== serverItem.checked) {
								changed = true
								updatedItem.checked = serverItem.checked
							}

							keepBot.updateItem(serverItem.id, updatedItem).catch((error) => {
								console.error(error)
							})
						} else {
							// This is an edge case. The object exists in keep, but doesn't exist
							// in the server. It means we lost some data. Use the server values.
							keepBot.updateItem(serverItem.id, serverItem).catch((error) => {
								console.error(error)
							})
						}
					} else {
						keepBot.addItem(serverItem.id, serverItem.name, serverItem.checked).catch((error) => {
							console.error(error)
						})
					}
				})

				await this.ctx.storage.put<ServerStore>("server-list", {
					lastChangedAt: serverLastChangedAt ?? new Date().toISOString(),
					items: serverList,
				})

				const diffStore = await keepBot.getList2()
				await this.ctx.storage.put<DiffStore>("keep-list", diffStore)
			}
		}
	}
}

export default {
	async fetch(request, env) {
		const req = getWsServerDurableObjectFetch("TinyObject")(request, env)
		return req
	},
} satisfies ExportedHandler<Env>
