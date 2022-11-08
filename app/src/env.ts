import { z } from 'zod'

const envSchema = z.object({
  WORKER_TRPC_URL: z.string().url(),
  AUTH_INFO: z.string().min(3),
})

export const env = envSchema.parse({
  AUTH_INFO: process.env.AUTH_INFO,
  WORKER_TRPC_URL: process.env.WORKER_TRPC_URL,
})
