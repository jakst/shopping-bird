import { type ElementHandle } from "puppeteer";
import { loadShoppingListPage } from "./browser";

const queue: (() => Promise<void>)[] = [];

function createAction<T extends (...args: any[]) => Promise<void>>(
  newAction: T,
) {
  return async (...args: Parameters<T>) => {
    queue.push(() => newAction(...args));
    if (queue.length === 1) {
      do {
        const action = queue[0];

        if (action) {
          console.time("Action completed in");
          await action();
          console.timeEnd("Action completed in");
        }

        queue.shift();
      } while (queue.length > 0);
    }
  };
}

export async function refreshPage() {
  await loadShoppingListPage(true);
}

export async function getItems() {
  const page = await loadShoppingListPage();

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li');

  let i = liElements.length - 1;
  const items = await Promise.all(
    liElements.map(async (liElement, index) => {
      const [name, checked] = await Promise.all([
        liElement.evaluate((el) => el.textContent ?? ""),
        liElement
          .$("input")
          .then((input) => input!.evaluate((el) => el.checked)),
      ]);

      return { index: i - index, name, checked };
    }),
  );

  return items;
}

export const checkItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage();

  const checkbox = (await page.$(
    `ul[aria-label="Min inköpslista"] > li input[aria-label="${name}"]`,
  )) as ElementHandle<HTMLInputElement> | null;

  if (checkbox) {
    const checked = await checkbox.evaluate((el) => el.checked);

    if (!checked) {
      await checkbox.click();
    }
  }
});

export const uncheckItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage();

  const checkbox = (await page.$(
    `ul[aria-label="Min inköpslista"] > li input[aria-label="${name}"]`,
  )) as ElementHandle<HTMLInputElement> | null;

  if (checkbox) {
    const checked = await checkbox.evaluate((el) => el.checked);

    if (checked) {
      await checkbox.click();
    }
  }
});

export const rename = createAction(async (oldName: string, newName: string) => {
  const page = await loadShoppingListPage();

  const [nameDisplay] = (await page.$x(
    `//ul/li//div[@role="button" and text()="${oldName}"]`,
  )) as [ElementHandle<HTMLDivElement>];
  await nameDisplay.click();

  await Promise.all([...oldName].map(() => nameDisplay.press("Backspace")));
  await nameDisplay.type(newName);

  const submitButton = (await page.$('ul > li button[aria-label="Klart"]'))!;
  await submitButton.click();
});

export const removeItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage();

  const [nameDisplay] = (await page.$x(
    `//ul/li//div[@role="button" and text()="${name}"]`,
  )) as [ElementHandle<HTMLDivElement>];
  await nameDisplay.click();

  const trashButton = (await page.$('ul > li button[aria-label="Radera"]'))!;

  await trashButton.click();
});

export const addItem = createAction(async (name: string) => {
  const page = await loadShoppingListPage();

  const newItemInput = (await page.$('input[aria-label="Lägg till objekt"]'))!;

  await newItemInput.type(name);
  await newItemInput.press("Enter");
});

const pause = (time = 2000) =>
  new Promise((resolve) => setTimeout(resolve, time));
