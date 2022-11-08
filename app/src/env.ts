import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  WORKER_TRPC_URL: z.string().url(),
  AUTH_INFO: z.string().min(3),
})

export const env = envSchema.parse(process.env)
