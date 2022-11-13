import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";
import { getCookies, setCookies } from "./bot/browser";
import { cache } from "./cache";
import { createContext } from "./context";
import { env } from "./env";
import { router } from "./router";

const server = fastify({
  maxParamLength: 5000,
});

server.get(
  "/ping",
  async () => `pong
    git commit: ${env.GIT_REVISION}
    cookies: ${(await getCookies())?.length ?? "no cookies"}
  `,
);

server.post("/auth", async (req, res) => {
  const { cookies } = req.body as { cookies: any[] };
  await setCookies(cookies);
  res.send();
});

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router,
    createContext,
  },
});

async function run() {
  try {
    console.log("[app] Starting web server", {
      GIT_REVISION: env.GIT_REVISION,
      PORT: env.PORT,
      HOST: env.HOST,
    });

    await cache.connect()
    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

run();
