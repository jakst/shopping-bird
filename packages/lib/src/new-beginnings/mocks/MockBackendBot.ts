import { type BackendClientBot } from "../BackendClient";
import { ShoppingListItem } from "../newSchemas";

export class MockBackendBot implements BackendClientBot {
  constructor(private shoppingList: Omit<ShoppingListItem, "id">[]) {}

  async getList() {
    return this.shoppingList;
  }

  async ADD_ITEM(name: string) {
    console.log("[BACKEND_CLIENT] ADD_ITEM", name);

    await new Promise((resolve) => setTimeout(resolve, 10));
    if (!this.shoppingList.some((item) => item.name === name))
      this.shoppingList.push({ name, checked: false });
  }

  async DELETE_ITEM(name: string) {
    console.log("[BACKEND_CLIENT] DELETE_ITEM", name);

    await new Promise((resolve) => setTimeout(resolve, 10));
    const index = this.shoppingList.findIndex((item) => item.name === name);
    if (index >= 0) this.shoppingList.splice(index, 1);
  }

  async RENAME_ITEM(oldName: string, newName: string) {
    console.log("[BACKEND_CLIENT] RENAME_ITEM", { oldName, newName });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const item = this.shoppingList.find((item) => item.name === oldName);
    if (item) item.name = newName;
  }

  async SET_ITEM_CHECKED(name: string, checked: boolean) {
    console.log("[BACKEND_CLIENT] SET_ITEM_CHECKED", { name, checked });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const item = this.shoppingList.find((item) => item.name === name);
    if (item) item.checked = checked;
  }

  async CLEAR_CHECKED_ITEMS() {
    console.log("[BACKEND_CLIENT] CLEAR_CHECKED_ITEMS");

    await new Promise((resolve) => setTimeout(resolve, 10));
    for (let i = this.shoppingList.length - 1; i >= 0; i--) {
      if (this.shoppingList[i].checked) this.shoppingList.splice(i, 1);
    }
  }
}
