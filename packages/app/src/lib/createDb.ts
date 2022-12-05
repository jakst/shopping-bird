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
    if (!db.some(({ id }) => id === item.id)) setDb((prev) => [...prev, item]);
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

  function clearCheckedItems() {
    setDb((prev) => prev.filter((item) => !item.checked));
    return undefined;
  }

  function applyAction(action: Action) {
    switch (action.name) {
      case "CREATE_ITEM":
        addItem(action.data);
        break;

      case "DELETE_ITEM":
        deleteItem(action.data.id);
        break;

      case "RENAME_ITEM":
        renameItem(action.data.id, action.data.newName);
        break;

      case "SET_ITEM_CHECKED":
        setChecked(action.data.id, action.data.checked);
        break;

      case "CLEAR_CHECKED_ITEMS":
        clearCheckedItems();
        break;
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
    clearCheckedItems,
  };
}
