import {
  actionListSchema,
  dbSchema,
  type Action,
  type Db,
} from "hello-bird-lib";

const ACTIONS_STORAGE_KEY = "ACTIONS_TO_SYNC";
export function getStoredActions() {
  try {
    const stringValue = localStorage.getItem(ACTIONS_STORAGE_KEY);
    const parsedValue = stringValue ? JSON.parse(stringValue) : [];
    return actionListSchema.parse(parsedValue);
  } catch {
    console.error(
      "Invalid format on stored actions. Clearing all unsynced actions...",
    );

    return [];
  }
}

export function persistActions(actions: Action[]) {
  localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
}

export function getStoredDb(storageKey: string): Db {
  try {
    const stringValue = localStorage.getItem(storageKey);
    const parsedValue = stringValue ? JSON.parse(stringValue) : [];
    return dbSchema.parse(parsedValue);
  } catch {
    console.error("Invalid format on stored DB. Emptying...");

    return [];
  }
}
