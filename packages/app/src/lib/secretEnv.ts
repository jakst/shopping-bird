import { z } from "zod"

export const secretEnv = z
	.object({
		AUTH_INFO: z.string().min(3),
		AUTH_SECRET: z.string().length(20),
	})
	.parse({
		AUTH_INFO: process.env["AUTH_INFO"],
		AUTH_SECRET: process.env["AUTH_SECRET"],
	})
