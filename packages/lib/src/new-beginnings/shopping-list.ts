import { ShoppinglistEvent, ShoppingListItem } from "./types";

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

  addItem(item: ShoppingListItem) {
    if (!this.items.some(({ id }) => item.id === id)) this.items.push(item);
  }

  applyEvents(events: ShoppinglistEvent[]) {
    events.forEach((event) => {
      switch (event.name) {
        case "ADD_ITEM": {
          this.addItem(event.data);
          break;
        }

        default: {
          const exhaustiveCheck: never = event.name;
          throw new Error(`EXHAUSTIVE CHECK ${exhaustiveCheck as string}`); // TODO
        }
      }
    });

    this.onChange(this.items);
  }
}
