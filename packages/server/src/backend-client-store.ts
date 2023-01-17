import { shoppingListItemSchema } from "hello-bird-lib";
import { z } from "zod";
import { createCached } from "./create-cached";

export const backendClientStoreCache = createCached(
  "backend-client-store",
  z.array(shoppingListItemSchema),
);
