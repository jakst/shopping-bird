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
    this.shoppingList.push({ name, checked });
    await pause(1);
  }

  async DELETE_ITEM(index: number) {
    this.shoppingList.splice(index, 1);
    await pause(1);
  }

  async SET_ITEM_CHECKED(index: number, checked: boolean) {
    this.shoppingList[index].checked = checked;
    await pause(1);
  }
}
