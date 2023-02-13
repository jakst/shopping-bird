import CredentialsProvider from "@auth/core/providers/credentials"
import { SolidAuthConfig } from "@solid-auth/next"
import { secretEnv } from "./secretEnv"

const { AUTH_INFO, AUTH_SECRET } = secretEnv

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
			// The name to display on the sign in form (e.g. "Sign in with...")
			name: "Credentials",
			credentials: {
				username: { label: "Username", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials) return null
				if (`${credentials.username}:${credentials.password}` !== AUTH_INFO) return null

				return { id: "1" }
			},
		}),
	],
	debug: false,
}
