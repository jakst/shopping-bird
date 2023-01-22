import { BackendListItem, type BackendClientBot } from "../BackendClient";
import { pause } from "./pause";

export class MockBackendBot implements BackendClientBot {
  constructor(private shoppingList: BackendListItem[]) {}

  async DELETE_ITEM2(index: number) {
    await pause(1);
    this.shoppingList.splice(index, 1);
  }
  async SET_ITEM_CHECKED2(index: number, checked: boolean) {
    await pause(1);
    this.shoppingList[index].checked = checked;
  }

  async getList() {
    const list = this.shoppingList.map((item, index) => ({ index, ...item }));
    return list;
  }

  async ADD_ITEM(name: string) {
    await pause(1);
    if (!this.shoppingList.some((item) => item.name === name))
      this.shoppingList.push({ name, checked: false });
  }

  async DELETE_ITEM(name: string) {
    await pause(1);
    const index = this.shoppingList.findIndex((item) => item.name === name);
    if (index >= 0) this.shoppingList.splice(index, 1);
  }

  async RENAME_ITEM(oldName: string, newName: string) {
    await pause(1);
    const item = this.shoppingList.find((item) => item.name === oldName);
    if (item) item.name = newName;
  }

  async SET_ITEM_CHECKED(name: string, checked: boolean) {
    await pause(1);
    const item = this.shoppingList.find((item) => item.name === name);
    if (item) item.checked = checked;
  }

  async CLEAR_CHECKED_ITEMS() {
    await pause(1);
    for (let i = this.shoppingList.length - 1; i >= 0; i--) {
      if (this.shoppingList[i].checked) this.shoppingList.splice(i, 1);
    }
  }
}
