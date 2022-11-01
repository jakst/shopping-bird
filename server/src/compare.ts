import test from 'node:test'

interface Item {
  name: string
  checked: boolean
}

export function compare(oldList: Item[], newList: Item[]) {
  const add: string[] = []
  const remove: string[] = []
  const check: string[] = []
  const uncheck: string[] = []

  newList.forEach((newItem) => {
    const oldItem = oldList.find((oldItem) => oldItem.name === newItem.name)
    if (!oldItem) add.push(newItem.name)
    else if (newItem.checked !== oldItem.checked)
      newItem.checked ? check.push(newItem.name) : uncheck.push(newItem.name)
  })

  oldList.forEach((oldItem) => {
    if (!newList.some((newItem) => newItem.name === oldItem.name))
      remove.push(oldItem.name)
  })

  return { add, remove, check, uncheck }
}

function assertEqual<T>(a: T, b: T) {
  const aJson = JSON.stringify(a)
  const bJson = JSON.stringify(b)

  if (aJson !== bJson) throw new Error(`"${aJson}" is not equal to "${bJson}"`)
}

test('Adds unchecked items', () => {
  const previousList: Item[] = []
  const newList: Item[] = [{ name: 'Ost', checked: false }]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: ['Ost'],
    remove: [],
    check: [],
    uncheck: [],
  })
})

test('Adds checked items', () => {
  const previousList: Item[] = []
  const newList: Item[] = [{ name: 'Ost', checked: true }]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: ['Ost'],
    remove: [],
    check: [],
    uncheck: [],
  })
})

test('Removes checked items', () => {
  const previousList: Item[] = [{ name: 'Kaffe', checked: true }]
  const newList: Item[] = []

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: [],
    remove: ['Kaffe'],
    check: [],
    uncheck: [],
  })
})

test('Removes unchecked items', () => {
  const previousList: Item[] = [{ name: 'Kaffe', checked: false }]
  const newList: Item[] = []

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: [],
    remove: ['Kaffe'],
    check: [],
    uncheck: [],
  })
})

test('Leaves unchanged items', () => {
  const previousList: Item[] = [{ name: 'Ost', checked: true }]
  const newList: Item[] = [{ name: 'Ost', checked: true }]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: [],
    remove: [],
    check: [],
    uncheck: [],
  })
})

test('Checks items', () => {
  const previousList: Item[] = [{ name: 'Ost', checked: false }]
  const newList: Item[] = [{ name: 'Ost', checked: true }]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: [],
    remove: [],
    check: ['Ost'],
    uncheck: [],
  })
})

test('Unchecks items', () => {
  const previousList: Item[] = [{ name: 'Ost', checked: true }]
  const newList: Item[] = [{ name: 'Ost', checked: false }]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: [],
    remove: [],
    check: [],
    uncheck: ['Ost'],
  })
})

test('Works for complex cases', () => {
  const previousList: Item[] = [
    { name: 'Ost', checked: true },
    { name: 'Kaffe', checked: false },
    { name: 'Mjölk', checked: false },
    { name: 'Yoghurt', checked: true },
  ]
  const newList: Item[] = [
    { name: 'Ost', checked: false },
    { name: 'Kaffe', checked: true },
    { name: 'Bröd', checked: false },
    { name: 'Bullar', checked: true },
  ]

  const res = compare(previousList, newList)

  assertEqual(res, {
    add: ['Bröd', 'Bullar'],
    remove: ['Mjölk', 'Yoghurt'],
    check: ['Kaffe'],
    uncheck: ['Ost'],
  })
})
