import { loadShoppingListPage } from './browser'

export async function getItems() {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  const items = await Promise.all(
    liElements.map(async (liElement) => {
      const [name, checked] = await Promise.all([
        liElement.evaluate((el) => el.textContent ?? ''),
        liElement
          .$('input')
          .then((input) => input!.evaluate((el) => el.checked)),
      ])

      return { name, checked }
    })
  )

  return items
}

export async function checkItem(name: string) {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  await Promise.all(
    liElements.map(async (liElement) => {
      const text = await liElement.evaluate((el) => el.textContent)

      if (text === name) {
        const input = await liElement.$('input')
        const checked = await input?.evaluate((el) => el.checked)
        if (!checked) await input?.click()
      }
    })
  )
}

export async function uncheckItem(name: string) {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  await Promise.all(
    liElements.map(async (liElement) => {
      const text = await liElement.evaluate((el) => el.textContent)

      if (text === name) {
        const input = await liElement.$('input')
        const checked = await input?.evaluate((el) => el.checked)
        if (checked) await input?.click()
      }
    })
  )
}
