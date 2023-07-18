import { z } from "zod"

export const env = z
	.object({
		BACKEND_URL: z.string().url(),
		WS_URL: z.string().url(),
	})
	.parse({
		BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
		WS_URL: import.meta.env.VITE_WS_URL,
	})
