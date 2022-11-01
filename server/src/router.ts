import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { checkItem, uncheckItem } from './bot/actions'
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

  // addItem: t.procedure.input(z.string()).mutation(() => {
  //   db.push({ name: 'Ost', checked: false })
  // }),
})

export type AppRouter = typeof router
