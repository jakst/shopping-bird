import { z } from "zod";

export const shoppingListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  checked: z.boolean(),
});

export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

const AddItem = z.object({
  name: z.literal("ADD_ITEM"),
  data: shoppingListItemSchema.pick({ id: true, name: true }),
});

const DeleteItem = z.object({
  name: z.literal("DELETE_ITEM"),
  data: z.object({
    id: z.string(),
  }),
});

const SetChecked = z.object({
  name: z.literal("SET_ITEM_CHECKED"),
  data: z.object({
    id: z.string(),
    checked: z.boolean(),
  }),
});

const RenameItem = z.object({
  name: z.literal("RENAME_ITEM"),
  data: z.object({
    id: z.string(),
    newName: z.string(),
  }),
});

export const eventSchema = z.discriminatedUnion("name", [
  AddItem,
  DeleteItem,
  SetChecked,
  RenameItem,
]);

export type ShoppingListEvent = z.infer<typeof eventSchema>;

export const eventListSchema = z.array(eventSchema);

export type GetShoppingListEventData<T extends ShoppingListEvent["name"]> =
  Extract<ShoppingListEvent, { name: T }>["data"];
