import {
  EnrichedAction,
  enrichedActionListSchema,
  googleCacheSchema,
  GoogleItem,
  Item,
} from "hello-bird-lib";
import {
  addItem,
  getItems,
  refreshPage,
  removeItem,
  rename,
  setChecked,
} from "./bot/actions";
import { cache } from "./cache";
import { getDb } from "./db";
import { Client, getClients } from "./sseClients";

let syncQueue: EnrichedAction[] = [];

export async function initSyncQueue() {
  console.time("[QUEUE init]");

  const storedQueue = await cache.get("SYNC_QUEUE");
  if (storedQueue)
    syncQueue = enrichedActionListSchema.parse(JSON.parse(storedQueue));

  console.timeEnd("[QUEUE init]");
}

async function persistSyncQueue() {
  await cache.set("SYNC_QUEUE", JSON.stringify(syncQueue));
}

export async function pushToSyncQueue(actions: EnrichedAction[]) {
  console.log(`Enqueueing ${actions.length} bot tasks`);
  syncQueue.push(...actions);
  await persistSyncQueue();

  // Do this in the background instead of awaiting it
  runSyncWorker();
}

let googleCache: GoogleItem[] = [];

export async function initGoogleCache() {
  console.time("[GOOGLE CACHE init]");

  const storedCache = await cache.get("GOOGLE_CACHE");
  if (storedCache) {
    googleCache = googleCacheSchema.parse(JSON.parse(storedCache));
  }

  console.timeEnd("[GOOGLE CACHE init]");
}

async function persistGoogleCache() {
  await cache.set("GOOGLE_CACHE", JSON.stringify(googleCache));
}

async function updateGoogleCache(newValue: GoogleItem[]) {
  googleCache = newValue;
  await persistGoogleCache();
}

let isWorking = false;
export async function runSyncWorker(forcedRun = true) {
  if (isWorking) {
    console.log("Bot busy. Holding off...");
    return;
  }

  const currentQueue = [...syncQueue];
  if (currentQueue.length < 1 && !forcedRun) return;

  isWorking = true;

  // Apply actions to cached version. Important to do first so that
  // lookups by name are possible if an item has been renamed.
  currentQueue
    .filter((action) => !action.meta.applied)
    .forEach((action) => {
      if (action.name === "CREATE_ITEM") {
        const { name, checked } = action.data;
        googleCache.push({ name, checked });
      } else if (action.name === "DELETE_ITEM") {
        googleCache = googleCache.filter(
          (item) => item.name !== action.meta.name,
        );
      } else {
        const item = googleCache.find((item) => item.name === action.meta.name);

        if (!item) return;

        if (action.name === "RENAME_ITEM") {
          item.name = action.data.newName;
        } else if (action.name === "SET_ITEM_CHECKED") {
          item.checked = action.data.checked;
        }
      }

      action.meta.applied = true;
    });

  // Make sure applied status is persisted
  await Promise.all([persistSyncQueue(), persistGoogleCache()]);

  await syncWithGoogle(currentQueue);

  // Remove the actions we processed in this run from the queue
  syncQueue = syncQueue.filter((action) => !currentQueue.includes(action));
  await persistSyncQueue();

  isWorking = false;

  // Run recursively again in case new actions have been pushed to the queue
  await runSyncWorker(false);
}

async function syncWithGoogle(actionsToApply: EnrichedAction[] = []) {
  console.log(`Starting to work on ${actionsToApply.length} bot tasks`);
  console.time(`Finished ${actionsToApply.length} bot tasks in`);

  await refreshPage();

  // Apply actions to Google Shopping List
  for (const action of actionsToApply) {
    if (action.name === "CREATE_ITEM") {
      await addItem(action.data.name);
      if (action.data.checked)
        await setChecked(action.data.name, action.data.checked);
    } else if (action.name === "DELETE_ITEM") {
      await removeItem(action.meta.name);
    } else if (action.name === "RENAME_ITEM") {
      await rename(action.meta.name, action.data.newName);
    } else if (action.name === "SET_ITEM_CHECKED") {
      await setChecked(action.meta.name, action.data.checked);
    }
  }

  const newGoogleList = await getItems();

  const db = getDb();

  // Get the Google list diff between now and last time we updated it. Generate actions
  // that represent changes that happened to the list outside of our system.
  const nrOfChanges = db.applyGoogleDiff(googleCache, newGoogleList);

  if (nrOfChanges > 0) {
    console.log(
      `Applying ${nrOfChanges} external changes from Google Shopping list`,
    );

    await Promise.all([db.persist(), updateGoogleCache(newGoogleList)]);

    const items = db.getItems();

    // Send the actions from the google diff out to all clients
    getClients().forEach((client) => notifyClient(client, items));
  } else {
    console.log("No changes detected in Google Shopping list");
  }

  console.timeEnd(`Finished ${actionsToApply.length} bot tasks in`);
}

export function notifyClient(client: Client, items: Item[]) {
  client.reply.sse({
    event: "db-update",
    data: JSON.stringify(items),
  });
}
