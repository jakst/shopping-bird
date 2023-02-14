import { createCookieSessionStorage } from "solid-start"
import { secretEnv } from "../secretEnv"

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "_session",
		secrets: [secretEnv.AUTH_SECRET],
		secure: true,
		maxAge: 60 * 60 * 24 * 365,
	},
})
