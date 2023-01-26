import cors from "@fastify/cors";
import fastify from "fastify";
import FastifySSEPlugin from "fastify-sse-v2";
import { eventListSchema } from "hello-bird-lib";
import { z } from "zod";
import { getCookies, setCookies } from "./bot/browser";
import { cache } from "./cache";
import { env } from "./env";
import { createShoppingBird } from "./shopping-bird";

const eventsEndpointSchema = z.object({
  clientId: z.string(),
  events: eventListSchema,
});

const f = fastify({
  maxParamLength: 5000,
  logger: true,
});

f.register(cors, {
  origin: env.FRONTEND_URL,
});

f.get(
  "/ping",
  async () => `pong
    git commit: ${env.GIT_REVISION}
    cookies: ${(await getCookies())?.length ?? "no cookies"}
  `,
);

f.post("/auth", async (req, reply) => {
  const { cookies } = req.body as { cookies: any[] };
  await setCookies(cookies);
  if (!appStarted) await startApp();
  console.log(`Successfully authed with ${cookies.length} cookies`);
  reply.send();
});

let appStarted = false;
async function startApp() {
  appStarted = true;
  f.register(FastifySSEPlugin);

  const shoppingBird = await createShoppingBird();

  f.get("/register", (request, reply) => {
    const clientId = shoppingBird.connectClient({
      notifyListChanged(items) {
        reply.sse({ event: "list-update", data: JSON.stringify(items) });
      },
    });

    reply.sse({ event: "client-id", data: clientId });

    request.raw.on("close", () => shoppingBird.onClientDisconnected(clientId));
  });

  f.post("/events", (request, reply) => {
    const parsedBody = eventsEndpointSchema.safeParse(
      JSON.parse(request.body as string),
    );

    if (!parsedBody.success) {
      reply.status(400);
      return;
    }

    shoppingBird.pushEvents(parsedBody.data.events, parsedBody.data.clientId);
    reply.status(204);
  });

  await shoppingBird.refreshDataFromBackendClient();
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

    if (cookies.length > 0) await startApp();
    else console.log("No cookies found. Waiting for auth...");

    await f.listen({
      port: env.PORT,
      host: env.HOST,
    });
  } catch (err) {
    console.log(err);
    f.log.error(err);
    process.exit(1);
  }
}

run();
//   .then(() => {
//   fetch("http://localhost:3500/events", {
//     method: "POST",
//     body: JSON.stringify({
//       clientId: "kungen",
//       events: [{ name: "DELETE_ITEM", data: { id: "123" } }],
//     }),
//   })
//     .then((res) => res.json())
//     .then((res) => console.log("HEJ", res));
// });
