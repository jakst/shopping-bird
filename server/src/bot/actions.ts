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

let pageRefreshedAt = 0
let _page: Awaited<ReturnType<typeof loadShoppingListPage>>
const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

async function getPage() {
  const now = Date.now()
  if (now - pageRefreshedAt > REFRESH_INTERVAL) {
    _page = await loadShoppingListPage()
    pageRefreshedAt = now
  }

  return _page
}

export async function getItems() {
  const page = await getPage()

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
  const page = await getPage()

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

export const rename = createAction(async (oldName: string, newName: string) => {
  const page = await getPage()

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
export const uncheckItem = createAction(async (name: string) => {
  const page = await getPage()

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

const pause = (time = 2000) =>
  new Promise((resolve) => setTimeout(resolve, time))
