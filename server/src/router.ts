import { initTRPC } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  addItem,
  checkItem,
  removeItem,
  rename,
  uncheckItem,
} from './bot/actions'
import { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router({
  getShoppingList: t.procedure.query(async (req) => {
    const { db } = req.ctx
    return Array.from(db.values())
  }),
  setChecked: t.procedure
    .input(z.object({ id: z.string(), checked: z.boolean() }))
    .mutation(async (req) => {
      const { db } = req.ctx
      const { id, checked } = req.input
      const item = db.get(id)

      if (item) {
        item.checked = checked
        if (checked) checkItem(item.name)
        else uncheckItem(item.name)
      } else {
        // Error ?
      }

      return item
    }),
  rename: t.procedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async (req) => {
      const { db } = req.ctx
      const { id, name } = req.input
      const item = db.get(id)

      if (item) {
        const oldName = item.name
        item.name = name

        rename(oldName, name)
      } else {
        // Error ?
      }
    }),

  addItem: t.procedure.input(z.string()).mutation((req) => {
    const { db } = req.ctx
    const name = req.input

    const id = randomUUID()

    db.set(id, {
      id,
      index: Math.max(...Array.from(db.values()).map((item) => item.index)) + 1,
      name,
      checked: false,
    })

    addItem(name)
  }),
  removeItem: t.procedure.input(z.string()).mutation((req) => {
    const { db } = req.ctx
    const id = req.input
    const item = db.get(id)

    if (item) {
      db.delete(id)

      removeItem(item.name)
    } else {
      // Error ?
    }
  }),
})

export type AppRouter = typeof router
