import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z
  .object({
    EMAIL: z.string().email(),
    PASSWORD: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]),
    GIT_REVISION: z.string().min(1).default("none"),
    AUTH_INFO: z.string().min(3),
    PORT: z
      .string()
      .default("3500")
      .transform((val) => parseInt(val)),
    HOST: z.string().default("localhost"),
    REDIS_URL: z.string(),
  })
  .transform((value) => {
    const { NODE_ENV, ...rest } = value;

    return {
      ...rest,
      isLocalDev: NODE_ENV === "development",
    };
  });

export const env = envSchema.parse(process.env);
