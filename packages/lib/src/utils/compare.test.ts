import { expect, test } from "vitest"
import { ShoppingListItem } from "../lib"
import { compare } from "./compare"

test("Adds unchecked items", () => {
	const previousList: ShoppingListItem[] = []
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{
			name: "ADD_ITEM",
			data: { id: "a", name: "Ost" },
		},
	])
})

test("Adds checked items", () => {
	const previousList: ShoppingListItem[] = []
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{
			name: "ADD_ITEM",
			data: { id: "a", name: "Ost" },
		},
		{
			name: "SET_ITEM_CHECKED",
			data: { id: "a", checked: true },
		},
	])
})

test("Removes checked items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Kaffe", checked: true }]
	const newList: ShoppingListItem[] = []

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "DELETE_ITEM", data: { id: "a" } }])
})

test("Removes unchecked items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Kaffe", checked: false }]
	const newList: ShoppingListItem[] = []

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "DELETE_ITEM", data: { id: "a" } }])
})

test("Leaves unchanged items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true }]

	const res = compare(previousList, newList)

	expect(res).toEqual([])
})

test("Checks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } }])
})

test("Unchecks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: true }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } }])
})

test("Renames items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Prästost", checked: false }]

	const res = compare(previousList, newList)

	expect(res).toEqual([{ name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } }])
})

test("Renames and checks items", () => {
	const previousList: ShoppingListItem[] = [{ id: "a", name: "Ost", checked: false }]
	const newList: ShoppingListItem[] = [{ id: "a", name: "Prästost", checked: true }]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: true } },
		{ name: "RENAME_ITEM", data: { id: "a", newName: "Prästost" } },
	])
})

test("Works for complex cases", () => {
	const previousList: ShoppingListItem[] = [
		{ id: "a", name: "Ost", checked: true },
		{ id: "b", name: "Kaffe", checked: false },
		{ id: "c", name: "Mjölk", checked: false },
		{ id: "d", name: "Yoghurt", checked: true },
	]
	const newList: ShoppingListItem[] = [
		{ id: "a", name: "Ost", checked: false },
		{ id: "b", name: "Kaffe", checked: true },
		{ id: "e", name: "Bröd", checked: false },
		{ id: "f", name: "Bullar", checked: true },
	]

	const res = compare(previousList, newList)

	expect(res).toEqual([
		{ name: "SET_ITEM_CHECKED", data: { id: "a", checked: false } },
		{ name: "SET_ITEM_CHECKED", data: { id: "b", checked: true } },
		{
			name: "ADD_ITEM",
			data: { id: "e", name: "Bröd" },
		},
		{
			name: "ADD_ITEM",
			data: { id: "f", name: "Bullar" },
		},
		{ name: "SET_ITEM_CHECKED", data: { id: "f", checked: true } },
		{ name: "DELETE_ITEM", data: { id: "c" } },
		{ name: "DELETE_ITEM", data: { id: "d" } },
	])
})
