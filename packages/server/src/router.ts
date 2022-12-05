import { initTRPC, TRPCError } from "@trpc/server";
import { Action, actionListSchema, EnrichedAction } from "hello-bird-lib";
import { z } from "zod";
import { getCookies } from "./bot/browser";
import { Context } from "./context";
import { Db } from "./db";
import { getClients } from "./sseClients";
import { notifyClient, pushToSyncQueue } from "./syncQueue";

const t = initTRPC.context<Context>().create();

const requiresAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.authed)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong auth header" });

  const cookies = await getCookies();
  if (!cookies?.length) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (!ctx.db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB not initialized",
    });

  return next({ ctx: { db: ctx.db } });
});

const authedProcedure = t.procedure.use(requiresAuth);

export const router = t.router({
  pushActions: authedProcedure
    .input(z.object({ sseId: z.string(), actions: actionListSchema }))
    .mutation(async (req) => {
      const { sseId, actions } = req.input;

      const connectedClients = getClients();

      if (!sseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No sse-id header found in action push request",
        });
      } else if (!connectedClients.map((client) => client.id).includes(sseId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Attached sse-id not in list of connected clients",
        });
      }

      console.log(
        `Recieved ${
          actions.length > 1 ? `${actions.length} actions` : "1 action"
        } from client "${sseId}"`,
      );

      const { db } = req.ctx;

      const googleActions = enrichAndApplyActions(db, actions);

      await db.persist();

      const items = db.getItems();
      connectedClients
        // We don't need to send the actions to the client that pushed them
        .filter((client) => client.id !== sseId)
        .forEach((client) => notifyClient(client, items));

      await pushToSyncQueue(googleActions);
    }),
  pullDb: authedProcedure.query((req) => {
    const { db } = req.ctx;
    return db.getItems();
  }),
});

export type AppRouter = typeof router;

function enrichAndApplyActions(db: Db, actions: Action[]) {
  const enrichedActions: EnrichedAction[] = [];

  actions.forEach((action) => {
    switch (action.name) {
      case "CREATE_ITEM": {
        const { name, checked } = action.data;
        enrichedActions.push({
          ...action,
          data: { name, checked },
          meta: { applied: false },
        });
        break;
      }

      case "CLEAR_CHECKED_ITEMS": {
        enrichedActions.push({
          ...action,
          meta: { applied: false },
        });

        break;
      }

      case "DELETE_ITEM":
      case "RENAME_ITEM":
      case "SET_ITEM_CHECKED": {
        const item = db.getItemById(action.data.id);

        if (item) {
          enrichedActions.push({
            ...action,
            meta: { name: item.name, applied: false },
          });
        } else {
          console.warn(`Could not find item with id ${action.data.id} in DB`);
        }
      }
    }

    // We have to apply every action while running the loop, because enriching
    // the next action might require data from this action being applied.
    db.applyAction(action);
  });

  return enrichedActions;
}
