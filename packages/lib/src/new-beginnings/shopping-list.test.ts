import { describe, expect, test } from "vitest";
import { ShoppingList } from "./shopping-list";

describe("CLEAR_CHECKED_ITEMS", () => {
  test("Only clears checked items", () => {
    const list = new ShoppingList([], () => {});

    list.applyEvent({ name: "ADD_ITEM", data: { id: "1", name: "Ost" } });
    list.applyEvent({ name: "ADD_ITEM", data: { id: "2", name: "Skinka" } });
    list.applyEvent({
      name: "SET_ITEM_CHECKED",
      data: { id: "1", checked: true },
    });
    list.applyEvent({ name: "CLEAR_CHECKED_ITEMS" });

    expect(list.items).toEqual([{ id: "2", name: "Skinka", checked: false }]);
  });

  test("Clears all checked items", () => {
    const list = new ShoppingList([], () => {});

    list.applyEvent({ name: "ADD_ITEM", data: { id: "1", name: "Ost" } });
    list.applyEvent({ name: "ADD_ITEM", data: { id: "2", name: "Skinka" } });
    list.applyEvent({
      name: "SET_ITEM_CHECKED",
      data: { id: "1", checked: true },
    });
    list.applyEvent({
      name: "SET_ITEM_CHECKED",
      data: { id: "2", checked: true },
    });
    list.applyEvent({ name: "CLEAR_CHECKED_ITEMS" });

    expect(list.items).toEqual([]);
  });
});
