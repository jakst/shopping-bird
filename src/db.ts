import { getItems } from './bot/actions'

const db: { name: string; checked: boolean }[] = []

console.log('Initing DB...')
const items = await getItems()
items.forEach((item) => db.push(item))

console.log('DB init finished!')
