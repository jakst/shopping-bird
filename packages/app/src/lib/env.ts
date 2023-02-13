import { z } from "zod"

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const env = z
	.object({
		BACKEND_URL: z.string().url(),
		AUTH_INFO: z.string().min(3),
	})
	.parse({
		AUTH_INFO: import.meta.env.VITE_AUTH_INFO,
		BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
	})
