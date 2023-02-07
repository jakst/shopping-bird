import { ExternalListItem, type Bot } from "../external-client"
import { pause } from "./pause"

export class MockBot implements Bot {
	constructor(private shoppingList: ExternalListItem[]) {}

	async refreshList() {}

	async getList() {
		await pause(1)
		const list = this.shoppingList.map((item, index) => ({ index, ...item }))
		return list
	}

	async ADD_ITEM(name: string, checked = false) {
		this.shoppingList.push({ name, checked })
		await pause(1)
	}

	async DELETE_ITEM(index: number) {
		this.shoppingList.splice(index, 1)
		await pause(1)
	}

	async SET_ITEM_CHECKED(index: number, checked: boolean) {
		this.shoppingList[index].checked = checked
		await pause(1)
	}
}
