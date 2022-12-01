import { z } from "zod";

export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  checked: z.boolean(),
  index: z.number(),
});

export type Item = z.infer<typeof itemSchema>;

export const dbSchema = z.array(itemSchema);
export type Db = z.infer<typeof dbSchema>;

const CreateItem = z.object({
  name: z.literal("CREATE_ITEM"),
  data: itemSchema,
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

export const actionSchema = z.discriminatedUnion("name", [
  CreateItem,
  DeleteItem,
  SetChecked,
  RenameItem,
]);

export type Action = z.infer<typeof actionSchema>;

export const actionListSchema = z.array(actionSchema);

export type GetActionData<T extends Action["name"]> = Extract<
  Action,
  { name: T }
>["data"];

export const googleItemSchema = itemSchema.pick({ name: true, checked: true });

export const googleCacheSchema = z.array(googleItemSchema);

export type GoogleItem = z.infer<typeof googleItemSchema>;

const metaNameAndAppliedSchema = z.object({
  name: z.string(),
  applied: z.boolean(),
});
export const enrichedActionSchema = z.discriminatedUnion("name", [
  CreateItem.pick({ name: true }).extend({
    data: googleItemSchema,
    meta: metaNameAndAppliedSchema.pick({ applied: true }),
  }),
  DeleteItem.extend({ meta: metaNameAndAppliedSchema }),
  SetChecked.extend({ meta: metaNameAndAppliedSchema }),
  RenameItem.extend({ meta: metaNameAndAppliedSchema }),
]);

export type EnrichedAction = z.infer<typeof enrichedActionSchema>;
export const enrichedActionListSchema = z.array(enrichedActionSchema);
export type EnrichedActionList = z.infer<typeof enrichedActionListSchema>;
