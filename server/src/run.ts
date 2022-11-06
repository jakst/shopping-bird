import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { createContext } from './context'
import { env } from './env'
import { router } from './router'

const server = fastify({
  maxParamLength: 5000,
})

server.get('/ping', () => 'pong')

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router,
    createContext,
  },
})

async function run() {
  try {
    await server.listen({
      port: 3500,
      host: env.isLocalDev ? 'localhost' : '0.0.0.0',
    })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

run()
