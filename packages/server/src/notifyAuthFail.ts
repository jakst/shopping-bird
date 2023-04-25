import { env } from "./env"

const PUSH_URL = "https://api.pushbullet.com/v2/pushes"

const fetchOptions: RequestInit = {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"Access-Token": env.PUSH_TOKEN,
	},
	body: JSON.stringify({ type: "note", title: "Shopping Bird auth has failed" }),
}

export async function notifyAuthFail() {
	fetch(PUSH_URL, fetchOptions).catch((err) => console.error(err))
}
