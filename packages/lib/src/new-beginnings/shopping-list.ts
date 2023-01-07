import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";

type OnChange = (list: ShoppingListItem[]) => void;

export class ShoppingList {
  items: ShoppingListItem[];

  constructor(initialItems: ShoppingListItem[], private onChange: OnChange) {
    this.items = initialItems;
  }

  replaceList(items: ShoppingListItem[]) {
    this.items = items;
    this.onChange(this.items);
  }

  applyEvents(events: ShoppingListEvent[]) {
    const results = events.map((event) => ({
      event,
      result: applyEvent(this.items, event),
    }));

    this.onChange(this.items);
    return results;
  }
}

export function applyEvent(
  list: ShoppingListItem[],
  event: ShoppingListEvent,
): boolean {
  const eventName = event.name;

  switch (eventName) {
    case "ADD_ITEM": {
      const alreadyExists = list.some(({ id }) => event.data.id === id);
      // console.log({ alreadyExists, list, event });

      if (alreadyExists) return false; // Duplicate ADD_ITEM events can be ignored
      list.push({ ...event.data, checked: false });
      break;
    }

    case "DELETE_ITEM": {
      // Duplicate DELETE_ITEM events will not have any effect
      const itemIndex = list.findIndex((item) => item.id === event.data.id);

      if (itemIndex < 0) return false;

      list.splice(itemIndex, 1);

      break;
    }

    case "SET_ITEM_CHECKED": {
      const item = list.find((item) => item.id === event.data.id);

      // If the item does not exist, it has been deleted and the event is moot
      if (!item) return false;

      item.checked = event.data.checked;
      break;
    }

    case "RENAME_ITEM": {
      const item = list.find((item) => item.id === event.data.id);

      // If the item does not exist, it has been deleted and the event is moot
      if (!item) return false;

      item.name = event.data.newName;
      break;
    }

    case "CLEAR_CHECKED_ITEMS": {
      let i = -1;
      do {
        i = list.findIndex((item) => item.checked === true);
        list.splice(i, 1);
      } while (i >= 0);

      break;
    }

    default: {
      const exhaustiveCheck: never = eventName;
      throw new Error(`EXHAUSTIVE CHECK ${exhaustiveCheck as string}`);
    }
  }

  return true;
}
