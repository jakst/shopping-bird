import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import { type AppRouter } from 'hello-bird-server'
import { env } from './env'

export const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: env.WORKER_TRPC_URL })],
})
