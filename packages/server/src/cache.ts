import { createClient } from "redis"
import { env } from "./env"

export const cache: ReturnType<typeof createClient> = createClient({ url: env.REDIS_URL })
