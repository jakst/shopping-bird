import test from "node:test";
import { compare } from "./compare";
import { Item } from "./schemas";

function assertEqual<T>(a: T, b: T) {
  const aJson = JSON.stringify(a);
  const bJson = JSON.stringify(b);

  if (aJson !== bJson) {
    throw new Error(`"${aJson}" is not equal to "${bJson}"`);
  }
}

test("Adds unchecked items", () => {
  const previousList: Item[] = [];
  const newList: Item[] = [{ id: "a", index: 0, name: "Ost", checked: false }];

  const res = compare(previousList, newList);

  assertEqual(res, [
    {
      name: "CREATE_ITEM",
      data: { id: "a", index: 0, name: "Ost", checked: false },
    },
  ]);
});

test("Adds checked items", () => {
  const previousList: Item[] = [];
  const newList: Item[] = [{ id: "a", index: 0, name: "Ost", checked: true }];

  const res = compare(previousList, newList);

  assertEqual(res, [
    {
      name: "CREATE_ITEM",
      data: { id: "a", index: 0, name: "Ost", checked: true },
    },
  ]);
});

test("Removes checked items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Kaffe", checked: true },
  ];
  const newList: Item[] = [];

  const res = compare(previousList, newList);

  assertEqual(res, [{ name: "DELETE_ITEM", data: { id: "a" } }]);
});

test("Removes unchecked items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Kaffe", checked: false },
  ];
  const newList: Item[] = [];

  const res = compare(previousList, newList);

  assertEqual(res, [{ name: "DELETE_ITEM", data: { id: "a" } }]);
});

test("Leaves unchanged items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: true },
  ];
  const newList: Item[] = [{ id: "a", index: 0, name: "Ost", checked: true }];

  const res = compare(previousList, newList);

  assertEqual(res, []);
});

test("Checks items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: false },
  ];
  const newList: Item[] = [{ id: "a", index: 0, name: "Ost", checked: true }];

  const res = compare(previousList, newList);

  assertEqual(res, [
    { name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } },
  ]);
});

test("Unchecks items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: true },
  ];
  const newList: Item[] = [{ id: "a", index: 0, name: "Ost", checked: false }];

  const res = compare(previousList, newList);

  assertEqual(res, [
    { name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } },
  ]);
});

test("Renames items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: false },
  ];
  const newList: Item[] = [
    { id: "a", index: 0, name: "Prästost", checked: false },
  ];

  const res = compare(previousList, newList);

  assertEqual(res, [
    { name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } },
  ]);
});

test("Renames and checks items", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: false },
  ];
  const newList: Item[] = [
    { id: "a", index: 0, name: "Prästost", checked: true },
  ];

  const res = compare(previousList, newList);

  assertEqual(res, [
    { name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } },
    { name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } },
  ]);
});

test("Works for complex cases", () => {
  const previousList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: true },
    { id: "b", index: 1, name: "Kaffe", checked: false },
    { id: "c", index: 2, name: "Mjölk", checked: false },
    { id: "d", index: 3, name: "Yoghurt", checked: true },
  ];
  const newList: Item[] = [
    { id: "a", index: 0, name: "Ost", checked: false },
    { id: "b", index: 1, name: "Kaffe", checked: true },
    { id: "e", index: 2, name: "Bröd", checked: false },
    { id: "f", index: 3, name: "Bullar", checked: true },
  ];

  const res = compare(previousList, newList);

  assertEqual(res, [
    { name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } },
    { name: "SET_ITEM_CHECKED", data: { id: "b", checked: true } },
    {
      name: "CREATE_ITEM",
      data: { id: "e", index: 2, name: "Bröd", checked: false },
    },
    {
      name: "CREATE_ITEM",
      data: { id: "f", index: 3, name: "Bullar", checked: true },
    },
    { name: "DELETE_ITEM", data: { id: "c" } },
    { name: "DELETE_ITEM", data: { id: "d" } },
  ]);
});
