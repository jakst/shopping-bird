import { inferAsyncReturnType } from "@trpc/server";
import { type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { getDb } from "./db";
import { env } from "./env";

export const REQUIRED_AUTH_HEADER = `Basic ${Buffer.from(
  env.AUTH_INFO,
).toString("base64")}`;

export async function createContext({ req }: CreateFastifyContextOptions) {
  if (req.headers.authorization !== REQUIRED_AUTH_HEADER)
    return { authed: false, db: null } as const;

  const db = await getDb();
  return { authed: true, db } as const;
}

export type Context = inferAsyncReturnType<typeof createContext>;
