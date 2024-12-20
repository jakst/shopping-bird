import { expect, test } from "vitest"
import type { ShoppingListItem } from "../lib"
import { compare } from "./compare"

test("Adds unchecked items", () => {
	const previousList: ShoppingListItem[] = []
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{
			name: "ADD_ITEM",
			data: { id: "a", name: "Ost" },
		},
		{
			name: "SET_ITEM_POSITION",
			data: { id: "a", position: 1 },
		},
	])
})

test("Adds checked items", () => {
	const previousList: ShoppingListItem[] = []
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{
			name: "ADD_ITEM",
			data: { id: "a", name: "Ost" },
		},
		{
			name: "SET_ITEM_POSITION",
			data: { id: "a", position: 1 },
		},
		{
			name: "SET_ITEM_CHECKED",
			data: { id: "a", checked: true },
		},
	])
})

test("Removes checked items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Kaffe", checked: true, position: 1 }]
	const newList: ShoppingListItem[] = []

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "DELETE_ITEM", data: { id: "a" } }])
})

test("Removes unchecked items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Kaffe", checked: false, position: 1 }]
	const newList: ShoppingListItem[] = []

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "DELETE_ITEM", data: { id: "a" } }])
})

test("Leaves unchanged items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true, position: 1 }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([])
})

test("Checks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false, position: 1 }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } }])
})

test("Unchecks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true, position: 1 }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } }])
})

test("Renames items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false, position: 1 }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Prästost", checked: false, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } }])
})

test("Renames and checks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false, position: 1 }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Prästost", checked: true, position: 1 }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } },
		{ name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } },
	])
})

test("Works for complex cases", () => {
	const previousList: ShoppingListItem[] = [
		{ id: "a", name: "Ost", checked: true, position: 1 },
		{ id: "b", name: "Kaffe", checked: false, position: 2 },
		{ id: "c", name: "Mjölk", checked: false, position: 3 },
		{ id: "d", name: "Yoghurt", checked: true, position: 4 },
	]
	const newList: ShoppingListItem[] = [
		{ id: "a", name: "Ost", checked: false, position: 1 },
		{ id: "e", name: "Bröd", checked: false, position: 2 },
		{ id: "b", name: "Kaffe", checked: true, position: 3 },
		{ id: "f", name: "Bullar", checked: true, position: 4 },
	]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } },
		{
			name: "ADD_ITEM",
			data: { id: "e", name: "Bröd" },
		},
		{ name: "SET_ITEM_POSITION", data: { id: "e", position: 2 } },
		{ name: "SET_ITEM_POSITION", data: { id: "b", position: 3 } },
		{ name: "SET_ITEM_CHECKED", data: { id: "b", checked: true } },
		{
			name: "ADD_ITEM",
			data: { id: "f", name: "Bullar" },
		},
		{ name: "SET_ITEM_POSITION", data: { id: "f", position: 4 } },
		{ name: "SET_ITEM_CHECKED", data: { id: "f", checked: true } },
		{ name: "DELETE_ITEM", data: { id: "c" } },
		{ name: "DELETE_ITEM", data: { id: "d" } },
	])
})
