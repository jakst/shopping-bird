import { type Bot, trimAndUppercase } from "lib"

function cleanFromTrash(value: string) {
	let res = value
	if (value.startsWith("till ")) res = res.slice(5)
	if (value.endsWith(" på")) res = res.slice(0, -3)

	return res
}

const alphabet = "0123456789abcdef"
function createRandomString(length: number) {
	return Array.from({ length }, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join()
}

// To obtain a master key
// * Go to https://accounts.google.com/EmbeddedSetup and log in
// * Grab `oauth_token` from cookies
// * Run `docker run --rm -it --entrypoint /bin/sh python:3 -c 'pip install gpsoauth; python3 -c '\''print(__import__("gpsoauth").exchange_token(input("Email: "), input("OAuth Token: "), input("Android ID: ")))'\'``
// * Pass in the gmail address, the oauth token and any android id (e.g. com.jakst.shopping-bird)
// * Grab the `Token` value from the JSON output. That's your master key.

async function getToken(options: { email: string; masterKey: string }) {
	const headers = new Headers({
		Host: "android.clients.google.com",
		"User-Agent": "GoogleAuth/1.4",
		Accept: "*/*",
		Connection: "keep-alive",
		"Content-type": "application/x-www-form-urlencoded",
		"Accept-Encoding": "identity",
		"Content-Length": "619",
	})

	const body = new URLSearchParams({
		accountType: "HOSTED_OR_GOOGLE",
		Email: options.email,
		has_permission: "1",
		EncryptedPasswd: options.masterKey,
		service: "oauth2:https://www.googleapis.com/auth/memento+https://www.googleapis.com/auth/reminders",
		source: "android",
		androidId: "1edf62768d3d",
		app: "com.google.android.keep",
		client_sig: "38918a453d07199354f8b19af05ec6562ced5788",
		device_country: "us",
		operatorCountry: "us",
		lang: "en",
		sdk_version: "17",
	})
		.toString()
		.replace("memento%2Bhttps", "memento+https")

	const response = await fetch("https://android.clients.google.com/auth", {
		method: "POST",
		headers,
		body,
	})

	const result = await response.text()

	const token = result
		.split("\n")
		.find((x) => x.startsWith("Auth="))
		?.substring(5)

	return token
}

interface List {
	id: string
	serverId: string
	type: "LIST"

	timestamps: {
		updated: string
	}
}

interface ListItem {
	id: string
	serverId: string
	parentId: string
	parentServerId: string
	type: "LIST_ITEM"
	sortValue: string
	text: string
	checked: boolean

	timestamps: {
		deleted?: string
	}
}

type Node = List | ListItem

// The API has been reverse engineered from https://github.com/kiwiz/gkeepapi
export class GoogleKeepBot implements Bot {
	token = ""

	constructor(private shoppingListId: string) {}

	async authenticate(options: { email: string; masterKey: string }) {
		const token = await getToken(options)
		if (token) this.token = token
		return Boolean(token)
	}

	async updateNodes(nodes: Partial<Node>[]) {
		const headers = new Headers({
			Authorization: `OAuth ${this.token}`,
		})

		const body = JSON.stringify({
			nodes,
			clientTimestamp: new Date().toISOString(),
			requestHeader: {
				clientSessionId: "s--1734127109614--8152091349",
				clientPlatform: "ANDROID",
				clientVersion: {
					major: "9",
					minor: "9",
					build: "9",
					revision: "9",
				},
				capabilities: [
					{ type: "NC" },
					{ type: "PI" },
					{ type: "LB" },
					{ type: "AN" },
					{ type: "SH" },
					{ type: "DR" },
					{ type: "TR" },
					{ type: "IN" },
					{ type: "SNB" },
					{ type: "MI" },
					{ type: "CO" },
				],
			},
		})

		const response = await fetch("https://www.googleapis.com/notes/v1/changes", {
			method: "POST",
			headers,
			body,
		})

		const result = await response.json()
		return result
	}

	async #getNodes(): Promise<Node[]> {
		const headers = new Headers({
			Authorization: `OAuth ${this.token}`,
		})
		const timestamp = new Date().toISOString()
		const body = JSON.stringify({
			nodes: [],
			clientTimestamp: timestamp,
			requestHeader: {
				clientSessionId: "s--1734121184097--5608582879",
				clientPlatform: "ANDROID",
				clientVersion: {
					major: "9",
					minor: "9",
					build: "9",
					revision: "9",
				},
				capabilities: [
					{ type: "NC" },
					{ type: "PI" },
					{ type: "LB" },
					{ type: "AN" },
					{ type: "SH" },
					{ type: "DR" },
					{ type: "TR" },
					{ type: "IN" },
					{ type: "SNB" },
					{ type: "MI" },
					{ type: "CO" },
				],
			},
		})

		const response = await fetch("https://www.googleapis.com/notes/v1/changes", {
			method: "POST",
			headers,
			body,
		})

		const result: { nodes: Node[] } = await response.json()
		return result.nodes
	}

	async #getItems() {
		const nodes = await this.#getNodes()
		const list = nodes.find((node) => {
			return node.type === "LIST" && node.serverId === this.shoppingListId
		}) as List

		const childItems = nodes.filter((node) => {
			return node.type === "LIST_ITEM" && node.parentServerId === this.shoppingListId
		}) as ListItem[]

		const sortedItems = childItems.sort((a, b) => parseInt(b.sortValue) - parseInt(a.sortValue))

		return { list, listItems: sortedItems }
	}

	async refreshList() {
		const { listItems } = await this.#getItems()

		const modifiedItems: typeof listItems = []
		listItems.forEach((item) => {
			const initialText = item.text

			let res = initialText
			res = cleanFromTrash(res)
			res = trimAndUppercase(res)

			if (res !== initialText) {
				item.text = res
				modifiedItems.push(item)
			}
		})

		await this.updateNodes(modifiedItems)
	}

	async getList() {
		const { listItems } = await this.#getItems()
		return listItems.map((item, index) => ({
			name: item.text,
			checked: item.checked,
			index,
		}))
	}

	async ADD_ITEM(name: string, checked?: boolean) {
		const { list, listItems } = await this.#getItems()

		const highestStortValue = listItems.reduce((min, item) => {
			const val = parseInt(item.sortValue)
			if (Number.isNaN(val)) return min
			return Math.min(min, val)
		}, 0)

		await this.updateNodes([
			{
				id: `${createRandomString(11)}.${createRandomString(14)}`,
				type: "LIST_ITEM" as const,
				parentId: list.id,
				text: name,
				checked,
				sortValue: (highestStortValue - 1000).toString(),
			},
		])
	}

	async DELETE_ITEM(index: number) {
		const { listItems } = await this.#getItems()
		const item = listItems[index]!

		item.timestamps.deleted = new Date().toISOString()
		await this.updateNodes([item])
	}

	async SET_ITEM_CHECKED(index: number, checked: boolean) {
		const { listItems } = await this.#getItems()
		const item = listItems[index]
		item.checked = checked

		await this.updateNodes([item])
	}
}
