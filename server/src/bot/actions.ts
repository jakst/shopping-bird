import { loadShoppingListPage } from './browser'

const queue: (() => Promise<void>)[] = []

function createAction<T extends (...args: any[]) => Promise<void>>(
  newAction: T
) {
  return async (...args: Parameters<T>) => {
    queue.push(() => newAction(...args))
    if (queue.length === 1) {
      do {
        const action = queue[0]
        console.time('Action completed in')
        if (action) await action()
        console.timeEnd('Action completed in')
        queue.shift()
      } while (queue.length > 0)
    }
  }
}

export async function refreshPage() {
  await loadShoppingListPage(true)
}

export async function getItems() {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  const items = await Promise.all(
    liElements.map(async (liElement, index) => {
      const [name, checked] = await Promise.all([
        liElement.evaluate((el) => el.textContent ?? ''),
        liElement
          .$('input')
          .then((input) => input!.evaluate((el) => el.checked)),
      ])

      return { index, name, checked }
    })
  )

  return items
}

export const checkItem = createAction(async (name: string) => {
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
})

export const uncheckItem = createAction(async (name: string) => {
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
})

export const rename = createAction(async (oldName: string, newName: string) => {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  await Promise.all(
    liElements.map(async (liElement) => {
      const text = await liElement.evaluate((el) => el.textContent)

      if (text === oldName) {
        const nameDisplay = (await liElement.$('div[role="button"'))!
        await nameDisplay.click()

        await Promise.all(
          [...oldName].map(() => nameDisplay.press('Backspace'))
        )

        await nameDisplay.type(newName)

        const submitButton = (await liElement.$('button[aria-label="Klart"'))!
        await submitButton.click()
      }
    })
  )
})
export const removeItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage()

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li')

  await Promise.all(
    liElements.map(async (liElement) => {
      const text = await liElement.evaluate((el) => el.textContent)

      if (text === name) {
        const nameDisplay = (await liElement.$('div[role="button"'))!
        await nameDisplay.click()

        const trashButton = (await liElement.$('button[aria-label="Radera"]'))!

        await trashButton.click()
      }
    })
  )
})

export const addItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage()

  const newItemInput = (await page.$('input[aria-label="Lägg till objekt"]'))!

  await newItemInput.type(name)
  await newItemInput.press('Enter')
})

const pause = (time = 2000) =>
  new Promise((resolve) => setTimeout(resolve, time))
