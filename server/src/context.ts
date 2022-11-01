import { inferAsyncReturnType } from '@trpc/server'
import { type CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { getDb } from './db'

export async function createContext(_: CreateFastifyContextOptions) {
  const db = await getDb()
  return { db }
}

export type Context = inferAsyncReturnType<typeof createContext>
