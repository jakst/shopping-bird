import CredentialsProvider from "@auth/core/providers/credentials"
import { type SolidAuthConfig } from "@auth/solid-start"
import { z } from "zod"
import { secretEnv } from "../secretEnv"

const { AUTH_INFO, AUTH_SECRET } = secretEnv

const trimmedString = z
	.string()
	.trim()
	.transform((v) => v.toLowerCase())

const credentialsSchema = z.object({
	username: trimmedString,
	password: trimmedString,
})

export const authOptions: SolidAuthConfig = {
	secret: AUTH_SECRET,
	session: { maxAge: 60 * 60 * 24 * 365 },
	callbacks: {
		async redirect() {
			return "/"
		},
	},
	providers: [
		CredentialsProvider({
			name: "username and password",
			credentials: {
				username: { label: "Username", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsedCredentials = credentialsSchema.safeParse(credentials)

				if (!parsedCredentials.success) return null

				const { username, password } = parsedCredentials.data
				if (`${username}:${password}` !== AUTH_INFO) return null

				return { id: "1" }
			},
		}),
	],
	debug: false,
}
