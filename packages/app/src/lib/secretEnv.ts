import { z } from "zod"

export const secretEnv = z
	.object({
		AUTH_INFO: z.string().min(3),
	})
	.parse({
		AUTH_INFO: process.env["AUTH_INFO"],
	})
