import { Authenticator } from "@solid-auth/core"
import { CredentialsStrategy } from "@solid-auth/credentials"
import { createCookieSessionStorage } from "solid-start"
import { z } from "zod"
import { secretEnv } from "../secretEnv"

const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "_session",
		secrets: [secretEnv.AUTH_SECRET],
		secure: true,
		maxAge: 60 * 60 * 24 * 365,
	},
})

const trimmedString = z
	.string()
	.trim()
	.transform((v) => v.toLowerCase())

const inputSchema = z.object({
	username: trimmedString,
	password: trimmedString,
})

const strategy = new CredentialsStrategy(async ({ input }) => {
	const { username, password } = inputSchema.parse(input)
	if (`${username}:${password}` !== secretEnv.AUTH_INFO) throw new Error("Wrong username or password")

	return { id: "1" }
})

export const authenticator = new Authenticator<{ id: string }>(sessionStorage).use(strategy)
