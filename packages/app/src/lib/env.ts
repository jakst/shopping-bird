import { z } from "zod"

export const env = z
	.object({
		WS_URL: z.string().url(),
		ENV_DISCRIMONATOR: z.string().default("dev"),
	})
	.parse({
		WS_URL: import.meta.env.VITE_WS_URL,
		ENV_DISCRIMONATOR: import.meta.env.VITE_ENV_DISCRIMONATOR,
	})
