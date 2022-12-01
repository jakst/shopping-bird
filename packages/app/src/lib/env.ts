import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url(),
  AUTH_INFO: z.string().min(3),
});

export const env = envSchema.parse({
  AUTH_INFO: import.meta.env.VITE_AUTH_INFO,
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
});
