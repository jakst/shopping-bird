import { BackendListItem, type BackendClientBot } from "../BackendClient";
import { pause } from "./pause";

export class MockBackendBot implements BackendClientBot {
  constructor(private shoppingList: BackendListItem[]) {}

  async refreshList() {}

  async getList() {
    const list = this.shoppingList.map((item, index) => ({ index, ...item }));
    return list;
  }

  async ADD_ITEM(name: string, checked = false) {
    await pause(1);
    if (!this.shoppingList.some((item) => item.name === name))
      this.shoppingList.push({ name, checked });
  }

  async DELETE_ITEM(index: number) {
    await pause(1);
    this.shoppingList.splice(index, 1);
  }

  async SET_ITEM_CHECKED(index: number, checked: boolean) {
    await pause(1);
    this.shoppingList[index].checked = checked;
  }
}
