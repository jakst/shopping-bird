import { config } from "dotenv"
import { z } from "zod"

config()

export const env = z
	.object({
		EMAIL: z.string().email(),
		PASSWORD: z.string().min(1),
		NODE_ENV: z.enum(["development", "production"]),
		GIT_REVISION: z.string().min(1).default("none"),
		AUTH_INFO: z.string().min(3),
		PORT: z
			.string()
			.default("3500")
			.transform((val) => parseInt(val)),
		HOST: z.string().default("localhost"),
		REDIS_URL: z.string(),
		FRONTEND_URL: z.string().url(),
		PUSH_TOKEN: z.string(),
		FULL_BROWSER: z.literal("1").optional(),
		LOCAL_DEV: z.literal("1").optional(),
	})
	.transform(({ NODE_ENV, LOCAL_DEV, ...rest }) => ({
		...rest,
		isLocalDev: NODE_ENV === "development" || LOCAL_DEV === "1",
	}))
	.parse(process.env)
