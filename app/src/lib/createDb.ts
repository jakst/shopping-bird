import { Action, Item } from "hello-bird-lib";
import { nanoid } from "nanoid/non-secure";
import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { getStoredDb } from "./storage";

export function createDb(storageKey: string) {
  const [db, setDb] = createStore(getStoredDb(storageKey));

  createEffect(() => {
    // NOTE: Granular tracking only works here because JSON.stringify
    // accesses all properties of items, which subscribes the effect.
    localStorage.setItem(storageKey, JSON.stringify(db));
  });

  function addItem(item: Item) {
    if (!db.some(({ id }) => id === item.id)) {
      setDb((prev) => [...prev, item]);
    }
  }

  function createItem(name: string) {
    const index = db.reduce((pr, curr) => Math.max(curr.index, pr), -1) + 1;

    const item = { id: nanoid(), checked: false, name, index };

    addItem(item);

    return item;
  }

  function deleteItem(id: string) {
    setDb((prev) => prev.filter((item) => item.id !== id));
    return { id };
  }

  function setChecked(id: string, checked: boolean) {
    setDb((item) => item.id === id, "checked", checked);
    return { id, checked };
  }

  function renameItem(id: string, newName: string) {
    setDb((item) => item.id === id, "name", newName);
    return { id, newName };
  }

  function applyAction(action: Action) {
    if (action.name === "CREATE_ITEM") {
      addItem(action.data);
    } else if (action.name === "DELETE_ITEM") {
      deleteItem(action.data.id);
    } else if (action.name === "RENAME_ITEM") {
      renameItem(action.data.id, action.data.newName);
    } else if (action.name === "SET_ITEM_CHECKED") {
      setChecked(action.data.id, action.data.checked);
    }
  }

  return {
    items: db,
    applyAction,
    addItem,
    createItem,
    deleteItem,
    setChecked,
    renameItem,
  };
}
