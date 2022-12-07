import { ShoppinglistEvent, ShoppingListItem } from "./types";

export class ShoppingList {
  items: ShoppingListItem[];

  constructor(initialItems: ShoppingListItem[]) {
    this.items = initialItems;
  }

  addItem(item: ShoppingListItem) {
    this.items.push(item);
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
  }
}
