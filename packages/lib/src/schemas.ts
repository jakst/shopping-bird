import { z } from "zod"

export const shoppingListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	checked: z.boolean(),
	position: z.number(),
})

export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>
