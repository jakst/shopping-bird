export interface ShoppingListItem {
  id: string;
}

export interface ShoppinglistEvent {
  name: "ADD_ITEM";
  data: ShoppingListItem;
}
