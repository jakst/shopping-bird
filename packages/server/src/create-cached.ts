import { z } from "zod";
import { cache } from "./cache";

export function createCached<Schema extends z.ZodType, Value = z.infer<Schema>>(
  key: string,
  schema: Schema,
) {
  async function get(): Promise<Value> {
    const queue = await cache
      .get(key)
      .then((str) => (str ? schema.parse(JSON.parse(str)) : []));

    return queue;
  }

  async function set(value: Value) {
    await cache.set(key, JSON.stringify(value));
  }

  return { get, set };
}
