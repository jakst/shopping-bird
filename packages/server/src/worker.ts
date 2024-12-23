import { type ShoppingListItem, createTinybaseClient } from "lib"
import { type Id, type IdAddedOrRemoved, createMergeableStore } from "tinybase"
import { createDurableObjectStoragePersister } from "tinybase/persisters/persister-durable-object-storage"
import {
	WsServerDurableObject,
	getWsServerDurableObjectFetch,
} from "tinybase/synchronizers/synchronizer-ws-server-durable-object"
import type { Env } from "./Env"
import { GoogleKeepBot } from "./google-keep-bot"

const SYNC_INTERVAL = 10_000

export class TinyDO extends WsServerDurableObject<Env> {
	tinybaseStore = createMergeableStore()
	shoppingList = createTinybaseClient(this.tinybaseStore)
	interval: ReturnType<typeof setInterval> | undefined

	onPathId(pathId: Id, addedOrRemoved: IdAddedOrRemoved) {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}

		// Enable syncing on an interval when there are clients connectect
		if (addedOrRemoved > 0) {
			this.interval = setInterval(() => this.sync(), SYNC_INTERVAL)
			this.sync()
		}
	}

	createPersister() {
		return createDurableObjectStoragePersister(this.tinybaseStore, this.ctx.storage)
	}

	async sync() {
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
		const newKeepList = await keepBot.getList()

		// If changes have been made in Keep since last time we checked, sync them back to the server.
		if (newKeepList.lastChangedAt !== prevKeepStore.lastChangedAt) {
			console.log("[KEEP] List changed. Syncing changes back to the shopping list...")

			const oldIds = new Set(prevKeepStore.items.map((item) => item.id))
			const newIds = new Set(newKeepList.items.map((item) => item.id))
			const removedIds = oldIds.difference(newIds)

			removedIds.forEach((id) => {
				console.log(`[KEEP] "${prevKeepStore.items.find((item) => item.id === id)?.name}" was removed`)
				this.shoppingList.removeItem(id)
			})

			newKeepList.items.forEach((newKeepItem) => {
				if (this.tinybaseStore.hasRow("items", newKeepItem.id)) {
					const previousKeepItem = prevKeepStore.items.find((prevKeepItem) => prevKeepItem.id === newKeepItem.id)

					if (previousKeepItem) {
						if (newKeepItem.name !== previousKeepItem.name) {
							console.log(`[KEEP] Name changed from "${previousKeepItem.name}" to "${newKeepItem.name}"`)
							this.shoppingList.renameItem(newKeepItem.id, newKeepItem.name)
						}

						if (newKeepItem.checked !== previousKeepItem.checked) {
							console.log(`[KEEP] "${newKeepItem.name}" was ${newKeepItem.checked ? "checked" : "unchecked"}`)
							this.shoppingList.setItemChecked(newKeepItem.id, newKeepItem.checked)
						}
					}
				} else {
					console.log(`[KEEP] Found  ${newKeepItem.checked ? "checked" : "unchecked"} new item "${newKeepItem.name}"`)
					this.shoppingList.addItem(newKeepItem.name, newKeepItem.id)
					if (newKeepItem.checked) this.shoppingList.setItemChecked(newKeepItem.id, true)
				}
			})

			await this.ctx.storage.put<DiffStore>("keep-list", newKeepList)
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
				console.log("Shopping list changed. Syncing changes to Keep...")
				const oldIds = new Set(prevServerStore.items.map((item) => item.id))
				const newIds = new Set(serverList.map((item) => item.id))
				const removedIds = oldIds.difference(newIds)

				removedIds.forEach((id) => {
					console.log(`Removing "${prevKeepStore.items.find((item) => item.id === id)?.name}" from Keep`)
					keepBot.deleteItem(id).catch((error) => {
						console.error(error)
					})
				})

				serverList.forEach((serverItem) => {
					const keepItem = newKeepList.items.find((keepItem) => keepItem.id === serverItem.id)

					if (keepItem) {
						const previousServerItem = prevServerStore.items.find((item) => item.id === serverItem.id)

						if (previousServerItem) {
							let changed = false
							const updatedItem: { name?: string; checked?: boolean } = {}
							if (previousServerItem.name !== serverItem.name) {
								console.log(`Renaming item "${previousServerItem.name}" to "${serverItem.name}" in Keep`)
								changed = true
								updatedItem.name = serverItem.name
							}
							if (previousServerItem.checked !== serverItem.checked) {
								console.log(`${serverItem.checked ? "Checking" : "Unchecking"} item "${serverItem.name}" in Keep`)
								changed = true
								updatedItem.checked = serverItem.checked
							}

							if (changed) {
								keepBot.updateItem(serverItem.id, updatedItem).catch((error) => {
									console.error(error)
								})
							}
						} else {
							// This is an edge case. The object exists in keep, but doesn't exist in the
							// server cache. It means we lost some cached data. Use the server values.

							console.warn(`Updating item (edge case) "${serverItem.name}" in keep`, { serverItem, keepItem })
							keepBot.updateItem(serverItem.id, serverItem).catch((error) => {
								console.error(error)
							})
						}
					} else {
						console.log(`Adding ${serverItem.checked ? "checked" : "unchecked"} item ${serverItem.name} to Keep`)
						keepBot
							.addItem(serverItem.id, serverItem.name)
							.then(() => {
								if (serverItem.checked) keepBot.updateItem(serverItem.id, { checked: true })
							})
							.catch((error) => {
								console.error(error)
							})
					}
				})

				await this.ctx.storage.put<ServerStore>("server-list", {
					lastChangedAt: serverLastChangedAt ?? new Date().toISOString(),
					items: serverList,
				})

				const diffStore = await keepBot.getList()
				await this.ctx.storage.put<DiffStore>("keep-list", diffStore)
			}
		}
	}
}

export default {
	async fetch(request, env) {
		const req = getWsServerDurableObjectFetch("TinyDO")(request, env)
		return req
	},
} satisfies ExportedHandler<Env>
