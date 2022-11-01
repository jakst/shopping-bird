import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { createContext } from './context'
import { router } from './router'

const server = fastify({
  maxParamLength: 5000,
})

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router,
    createContext,
  },
})

try {
  await server.listen({ port: 3500 })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
