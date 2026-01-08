import { type ShoppingListItem, createTinybaseClient } from "lib"
import { type Id, type IdAddedOrRemoved, createMergeableStore } from "tinybase"
import { createDurableObjectSqlStoragePersister } from "tinybase/persisters/persister-durable-object-sql-storage"
import {
	WsServerDurableObject,
	getWsServerDurableObjectFetch,
} from "tinybase/synchronizers/synchronizer-ws-server-durable-object"
import type { Env } from "./Env"
import { GoogleKeepBot } from "./google-keep-bot"

const SHORT_SYNC_INTERVAL = 1000 * 30 // Every 30 seconds
const LONG_SYNC_INTERVAL = 1000 * 60 * 30 // Every 30 minutes

export class ShoppingBirdDO extends WsServerDurableObject<Env> {
	tinybaseStore = createMergeableStore()
	shoppingList = createTinybaseClient(this.tinybaseStore)

	hasConnectedClients = false
	get currentInterval() {
		return this.hasConnectedClients ? SHORT_SYNC_INTERVAL : LONG_SYNC_INTERVAL
	}

	createPersister() {
		return createDurableObjectSqlStoragePersister(this.tinybaseStore, this.ctx.storage.sql)
	}

	onPathId(pathId: Id, addedOrRemoved: IdAddedOrRemoved) {
		if (addedOrRemoved > 0 !== this.hasConnectedClients) {
			this.hasConnectedClients = addedOrRemoved > 0

			const { shouldSyncImmediate, logLine } = this.hasConnectedClients
				? { shouldSyncImmediate: true, logLine: "Client connected" }
				: { shouldSyncImmediate: false, logLine: "All clients disconnected" }

			console.log(`${logLine}. Setting sync interval to ${this.currentInterval / 1000}s`)
			this.ctx.storage.setAlarm(Date.now() + this.currentInterval)

			if (shouldSyncImmediate) this.sync()
		}
	}

	async alarm(alarmInfo?: AlarmInvocationInfo) {
		const currentHour = new Date().getUTCHours()
		let nextAlarm = Date.now() + this.currentInterval

		// If it's no longer daytime, set the alarm for 06:00 UTC
		if (currentHour < 6 || currentHour > 21) {
			const nextAlarmDate = new Date()
			nextAlarmDate.setUTCHours(6, 0, 0, 0)
			nextAlarm = nextAlarmDate.getTime()

			if (currentHour > 21) {
				console.log(
					"[Alarm] It's too late in the evening. Setting next alarm for tomorrow",
					nextAlarmDate.toISOString(),
				)
				nextAlarmDate.setUTCDate(nextAlarmDate.getUTCDate() + 1)
				nextAlarm = nextAlarmDate.getTime()
			} else {
				console.log(
					"[Alarm] It's too early in the morning. Setting next alarm for 06:00 UTC",
					nextAlarmDate.toISOString(),
				)
			}
		} else {
			console.log(`[Alarm] Setting next alarm in ${this.currentInterval / 1000}s`, new Date(nextAlarm).toISOString())
		}

		this.ctx.storage.setAlarm(nextAlarm)
		await this.sync()
	}

	async sync() {
		// Use blockConcurrencyWhile to prevent overlapping sync runs.
		// This ensures we don't have two syncs interleaving and stomping cached baselines.
		await this.ctx.blockConcurrencyWhile(async () => {
			console.log("Sync initiated")
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

			type ServerStore = {
				lastChangedAt: string
				items: ShoppingListItem[]
			}

			const prevKeepStore = (await this.ctx.storage.get<DiffStore>("keep-list")) ?? { lastChangedAt: "", items: [] }
			const newKeepList = await keepBot.getList()

			// If changes have been made in Keep since last time we checked, sync them back to the server.
			if (newKeepList.lastChangedAt !== prevKeepStore.lastChangedAt) {
				console.log("[KEEP] List changed. Syncing changes back to the shopping list...")

				await keepBot.refreshList()

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
			}

			// Always check for server→Keep sync, even if Keep changed.
			// This handles the case where both sides changed between sync runs.
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

				// Collect all Keep write promises so we can await them before snapshotting.
				const keepWritePromises: Promise<unknown>[] = []

				const oldIds = new Set(prevServerStore.items.map((item) => item.id))
				const newIds = new Set(serverList.map((item) => item.id))
				const removedIds = oldIds.difference(newIds)

				// Re-fetch Keep list to get current state for comparisons
				const currentKeepList = await keepBot.getList()

				removedIds.forEach((id) => {
					console.log(`Removing "${prevServerStore.items.find((item) => item.id === id)?.name}" from Keep`)
					keepWritePromises.push(keepBot.deleteItem(id))
				})

				serverList.forEach((serverItem) => {
					const keepItem = currentKeepList.items.find((keepItem) => keepItem.id === serverItem.id)

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
								keepWritePromises.push(keepBot.updateItem(serverItem.id, updatedItem))
							}
						} else {
							// This is an edge case. The object exists in keep, but doesn't exist in the
							// server cache. It means we lost some cached data. Use the server values.

							console.warn(`Updating item (edge case) "${serverItem.name}" in keep`, { serverItem, keepItem })
							keepWritePromises.push(keepBot.updateItem(serverItem.id, serverItem))
						}
					} else {
						console.log(`Adding ${serverItem.checked ? "checked" : "unchecked"} item ${serverItem.name} to Keep`)
						keepWritePromises.push(
							keepBot.addItem(serverItem.id, serverItem.name).then(async () => {
								if (serverItem.checked) await keepBot.updateItem(serverItem.id, { checked: true })
							}),
						)
					}
				})

				// Wait for all Keep writes to complete before snapshotting.
				// Use allSettled so one failure doesn't abort the whole sync.
				const results = await Promise.allSettled(keepWritePromises)
				const failures = results.filter((r) => r.status === "rejected")
				if (failures.length > 0) {
					console.error(`${failures.length} Keep write(s) failed:`, failures)
				}

				// Now fetch the post-write Keep state and persist both snapshots.
				const finalKeepList = await keepBot.getList()
				await this.ctx.storage.put<DiffStore>("keep-list", finalKeepList)

				await this.ctx.storage.put<ServerStore>("server-list", {
					lastChangedAt: serverLastChangedAt ?? new Date().toISOString(),
					items: serverList,
				})
			}
		})
	}
}

export default {
	async fetch(request, env) {
		const req = getWsServerDurableObjectFetch("ShoppingBirdDO")(request, env)
		return req
	},
} satisfies ExportedHandler<Env>
