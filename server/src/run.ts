import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";
import FastifySSEPlugin from "fastify-sse-v2";
import { getCookies, loadShoppingListPage, setCookies } from "./bot/browser";
import { cache } from "./cache";
import { createContext } from "./context";
import { initDb } from "./db";
import { env } from "./env";
import { router } from "./router";
import { createClient, removeClient } from "./sseClients";
import { initGoogleCache, initSyncQueue, runSyncWorker } from "./syncQueue";

const server = fastify({
  maxParamLength: 5000,
});

server.register(cors, {
  origin: env.FRONTEND_URL,
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
  await startApp();
  console.log(`Successfully authed with ${cookies.length} cookies`);
  res.send();
});

async function startApp() {
  console.log("Starging app...");
  server.register(FastifySSEPlugin);

  server.get("/sse", (request, reply) => {
    const clientId = request.id;

    createClient(clientId, reply);
    console.log(`${clientId} connection opened`);

    reply.sse({ event: "sse-id", data: clientId });

    request.raw.on("close", () => {
      console.log(`${clientId} connection closed`);
      removeClient(clientId);
    });
  });

  server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router,
      createContext,
    },
  });

  await Promise.all([
    initSyncQueue(),
    initDb(),
    initGoogleCache(),
    loadShoppingListPage(), // Warm up browser
  ]);

  await runSyncWorker();
}

async function run() {
  try {
    console.log("[app] Starting web server", {
      GIT_REVISION: env.GIT_REVISION,
      PORT: env.PORT,
      HOST: env.HOST,
    });

    await cache.connect();

    const cookies = await getCookies();

    if (cookies.length > 0) {
      await startApp();
    } else {
      console.log("No cookies found. Waiting for auth...");
    }

    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (err) {
    console.log(err);
    server.log.error(err);
    process.exit(1);
  }
}

run();
