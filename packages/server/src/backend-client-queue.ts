import { eventListSchema } from "hello-bird-lib";
import { z } from "zod";
import { createCached } from "./create-cached";

export const backendClientQueueCache = createCached(
  "backend-client-queue",
  // Array of event arrays... 😐
  z.array(eventListSchema),
);
