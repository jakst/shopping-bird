import { z } from "zod"

export const shoppingListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	checked: z.boolean(),
	position: z.number().optional(),
})

export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>

export const shoppingListSchema = z.array(shoppingListItemSchema)

const AddItem = z.object({
	name: z.literal("ADD_ITEM"),
	data: shoppingListItemSchema.pick({ id: true, name: true }),
})

const DeleteItem = z.object({
	name: z.literal("DELETE_ITEM"),
	data: z.object({
		id: z.string(),
	}),
})

const SetChecked = z.object({
	name: z.literal("SET_ITEM_CHECKED"),
	data: z.object({
		id: z.string(),
		checked: z.boolean(),
	}),
})

const RenameItem = z.object({
	name: z.literal("RENAME_ITEM"),
	data: z.object({
		id: z.string(),
		newName: z.string(),
	}),
})

const MoveItem = z.object({
	name: z.literal("MOVE_ITEM"),
	data: z.object({
		id: z.string(),
		fromPosition: z.number(),
		toPosition: z.number(),
	}),
})

export const eventSchema = z.discriminatedUnion("name", [AddItem, DeleteItem, SetChecked, RenameItem, MoveItem])

export type ShoppingListEvent = z.infer<typeof eventSchema>

export const eventListSchema = z.array(eventSchema)

export const responseMessageSchema = z.object({
	shoppingList: shoppingListSchema,
})

export const updateMessageSchema = z.object({
	clientId: z.string(),
	shoppingList: shoppingListSchema,
})

export type UpdateMessage = z.infer<typeof updateMessageSchema>
