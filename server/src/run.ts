import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { setCookies } from './bot/browser'
import { createContext } from './context'
import { env } from './env'
import { router } from './router'

const server = fastify({
  maxParamLength: 5000,
})

server.get('/ping', () => `pong (git commit: ${env.GIT_REVISION})`)

server.post('/auth', async (req, res) => {
  const { cookies } = req.body as { cookies: any[] }
  await setCookies(cookies)
  res.send()
})

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router,
    createContext,
  },
})

async function run() {
  try {
    console.log('[app] Starting web server', {
      GIT_REVISION: env.GIT_REVISION,
    })
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
