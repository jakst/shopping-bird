import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { checkItem, uncheckItem } from './bot/actions'
import { getDb } from './db'

const t = initTRPC.create()

export const router = t.router({
  getShoppingList: t.procedure.query(async () => {
    const db = await getDb()
    return Array.from(db.values())
  }),
  setChecked: t.procedure
    .input(z.object({ id: z.string(), checked: z.boolean() }))
    .mutation(async (req) => {
      const { id, checked } = req.input
      const db = await getDb()
      const item = db.get(id)

      if (item) {
        item.checked = checked
        if (checked) checkItem(item.name)
        else uncheckItem(item.name)
      } else {
        // Error ?
      }
    }),

  // addItem: t.procedure.input(z.string()).mutation(() => {
  //   db.push({ name: 'Ost', checked: false })
  // }),
})

export type AppRouter = typeof router
