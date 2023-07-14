import { shoppingListItemSchema } from "lib"
import { z } from "zod"

export function createCached<Schema extends z.ZodSchema, Value = z.infer<Schema>>(key: string, schema: Schema) {
	return (kv: KVNamespace) => ({
		async get() {
			const rawData = await kv.get(key)
			return schema.parse(rawData ? JSON.parse(rawData) : undefined) as Value
		},
		async set(value: Value) {
			await kv.put(key, JSON.stringify(value))
		},
	})
}

const cookiesSchema = z.array(z.any()).default([])
export const cookiesCache = createCached("cookies", cookiesSchema)

const googleListSchema = z.array(shoppingListItemSchema).default([])
export const googleListCache = createCached("google-list", googleListSchema)

const targetListSchema = z
	.object({ dirty: z.boolean(), data: z.array(shoppingListItemSchema) })
	.default({ dirty: false, data: [] })
export const targetListCache = createCached("target-list", targetListSchema)
