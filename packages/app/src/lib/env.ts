import { z } from "zod"

export const env = z
	.object({
		BACKEND_URL: z.string().url(),
	})
	.parse({
		BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
	})
