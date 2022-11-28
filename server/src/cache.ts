import { createClient } from "redis";
import { env } from "./env";

export const cache = createClient({ url: env.REDIS_URL });
