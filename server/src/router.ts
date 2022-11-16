import { initTRPC, TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  addItem,
  checkItem,
  getItems,
  refreshPage,
  removeItem,
  rename,
  uncheckItem,
} from "./bot/actions";
import { getCookies } from "./bot/browser";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

const requiresAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.authed) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong auth header" });
  }

  const cookies = await getCookies();
  if (!cookies?.length) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB not initialized",
    });
  }

  return next({ ctx: { db: ctx.db } });
});

const authedProcedure = t.procedure.use(requiresAuth);

export const router = t.router({
  getShoppingList: authedProcedure.query(async (req) => {
    const { db } = req.ctx;
    return Array.from(db.values());
  }),
  sync: authedProcedure.mutation(async (req) => {
    const { db } = req.ctx;

    console.time("[controller] refreshPage");
    await refreshPage();
    console.timeEnd("[controller] refreshPage");
    console.time("[controller] getItems");
    const items = await getItems();
    console.timeEnd("[controller] getItems");

    db.clear();
    items.forEach(({ index, name, checked }) => {
      const id = randomUUID();
      db.set(id, { id, index, name, checked });
    });
  }),
  setChecked: authedProcedure
    .input(z.object({ id: z.string(), checked: z.boolean() }))
    .mutation(async (req) => {
      const { db } = req.ctx;
      const { id, checked } = req.input;
      const item = db.get(id);

      if (item) {
        item.checked = checked;
        if (checked) {
          checkItem(item.name);
        } else {
          uncheckItem(item.name);
        }
      } else {
        // Error ?
      }

      return item;
    }),
  rename: authedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async (req) => {
      const { db } = req.ctx;
      const { id, name } = req.input;
      const item = db.get(id);

      if (item) {
        const oldName = item.name;
        item.name = name;

        rename(oldName, name);
      } else {
        // Error ?
      }
    }),

  addItem: authedProcedure.input(z.string()).mutation((req) => {
    const { db } = req.ctx;
    const name = req.input;

    const id = randomUUID();

    db.set(id, {
      id,
      index: Math.max(...Array.from(db.values()).map((item) => item.index)) + 1,
      name,
      checked: false,
    });

    addItem(name);
  }),
  removeItem: authedProcedure.input(z.string()).mutation((req) => {
    const { db } = req.ctx;
    const id = req.input;
    const item = db.get(id);

    if (item) {
      db.delete(id);

      removeItem(item.name);
    } else {
      // Error ?
    }
  }),
});

export type AppRouter = typeof router;
