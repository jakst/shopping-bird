import { Action, Item } from "./schemas";

export function compare(oldList: Item[], newList: Item[]) {
  const actions: Action[] = [];

  newList.forEach((newItem) => {
    const oldItem = oldList.find((oldItem) => oldItem.id === newItem.id);
    if (oldItem) {
      if (newItem.checked !== oldItem.checked)
        actions.push({
          name: "SET_ITEM_CHECKED",
          data: { id: oldItem.id, checked: newItem.checked },
        });

      if (newItem.name !== oldItem.name)
        actions.push({
          name: "RENAME_ITEM",
          data: { id: oldItem.id, newName: newItem.name },
        });
    } else {
      actions.push({ name: "CREATE_ITEM", data: newItem });
    }
  });

  oldList.forEach((oldItem) => {
    if (!newList.some((newItem) => newItem.id === oldItem.id))
      actions.push({ name: "DELETE_ITEM", data: { id: oldItem.id } });
  });

  return actions;
}
