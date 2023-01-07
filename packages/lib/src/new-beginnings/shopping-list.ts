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
    events.forEach((event) => {
      const eventName = event.name;

      switch (eventName) {
        case "ADD_ITEM": {
          // Duplicate ADD_ITEM events can be ignored
          if (this.items.some(({ id }) => event.data.id === id)) return;
          this.items.push({ ...event.data, checked: false });
          break;
        }

        case "DELETE_ITEM": {
          // Duplicate DELETE_ITEM events will not have any effect
          this.items = this.items.filter((item) => item.id !== event.data.id);
          break;
        }

        case "SET_ITEM_CHECKED": {
          const item = this.items.find((item) => item.id === event.data.id);

          // If the item does not exist, it has been deleted and the event is moot
          if (!item) return;

          item.checked = event.data.checked;
          break;
        }

        case "RENAME_ITEM": {
          const item = this.items.find((item) => item.id === event.data.id);

          // If the item does not exist, it has been deleted and the event is moot
          if (!item) return;

          item.name = event.data.newName;
          break;
        }

        case "CLEAR_CHECKED_ITEMS": {
          this.items = this.items.filter((item) => item.checked === false);
          break;
        }

        default: {
          const exhaustiveCheck: never = eventName;
          throw new Error(`EXHAUSTIVE CHECK ${exhaustiveCheck as string}`);
        }
      }
    });

    this.onChange(this.items);
  }
}
