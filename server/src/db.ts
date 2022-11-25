import { GoogleItem, itemSchema, type Action, type Item } from "hello-bird-lib";
import { z } from "zod";
import { cache } from "./cache";

let nanoid: () => string;
let db = createDb([]);

export type Db = typeof db;

export async function initDb() {
  await import("nanoid").then((module) => (nanoid = module.nanoid));
  console.time("[DB init]");

  const storedData = await cache.get("DB");
  if (storedData) {
    db = createDb(z.array(itemSchema).parse(JSON.parse(storedData)));
  }

  console.timeEnd("[DB init]");
}

export function getDb() {
  return db;
}

function createDb(initItems: Item[]) {
  const db = new Map<string, Item>(initItems.map((item) => [item.id, item]));

  function getItemById(id: Item["id"]) {
    return db.get(id);
  }

  function getItems() {
    return Array.from(db.values());
  }

  function addItem(item: Item) {
    if (!db.has(item.id)) {
      db.set(item.id, item);
    }
  }

  function createItem({ name, checked }: Pick<Item, "name" | "checked">) {
    const index =
      getItems().reduce((pr, curr) => Math.max(curr.index, pr), -1) + 1;

    const item = { id: nanoid(), checked, name, index };

    addItem(item);
  }

  function deleteItem(id: string) {
    db.delete(id);
  }

  function setChecked(id: string, checked: boolean) {
    const item = db.get(id);

    if (item) {
      item.checked = checked;
    }
  }

  function renameItem(id: string, name: string) {
    const item = db.get(id);

    if (item) {
      item.name = name;
    }
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

  async function persist() {
    console.time("DB persist");
    const stringifiedDb = JSON.stringify(Array.from(db.values()));
    await cache.set("DB", stringifiedDb);
    console.timeEnd("DB persist");
  }

  function applyGoogleDiff(oldList: GoogleItem[], newList: GoogleItem[]) {
    let changes = 0;

    newList.forEach((newItem) => {
      const oldItem = oldList.find((oldItem) => oldItem.name === newItem.name);
      if (!oldItem) {
        createItem(newItem);
        changes++;
      } else if (newItem.checked !== oldItem.checked) {
        const id = getItems().find(({ name }) => name === newItem.name)?.id;
        if (id) {
          setChecked(id, newItem.checked);
          changes++;
        }
      }
    });

    oldList.forEach((oldItem) => {
      if (!newList.some((newItem) => newItem.name === oldItem.name)) {
        const id = getItems().find(({ name }) => name === oldItem.name)?.id;
        if (id) {
          deleteItem(id);
          changes++;
        }
      }
    });

    return changes;
  }

  return {
    getItemById,
    getItems,
    applyAction,
    persist,
    applyGoogleDiff,
  };
}
