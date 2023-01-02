import { trimAndUppercase } from "hello-bird-lib";
import { type ElementHandle } from "puppeteer";
import { getPage } from "./browser";

const queue: (() => Promise<void>)[] = [];

function createAction<T extends (...args: any[]) => Promise<void>>(
  newAction: T,
) {
  return async (...args: Parameters<T>) => {
    queue.push(() => newAction(...args));
    if (queue.length === 1)
      do {
        const action = queue[0];

        if (action) {
          console.time("Action completed in");
          await action();
          console.timeEnd("Action completed in");
        }

        queue.shift();
      } while (queue.length > 0);
  };
}

export async function getItems() {
  const page = await getPage();

  const liElements = await page.$$('ul[aria-label="Min inköpslista"] > li');

  const items = await Promise.all(
    liElements.map(async (liElement) => {
      const [name, checked] = await Promise.all([
        liElement.evaluate((el) => el.textContent ?? ""),
        liElement
          .$("input")
          .then((input) => input!.evaluate((el) => el.checked)),
      ]);

      return { name, checked };
    }),
  );

  const disoceveredItemNames = new Set<string>();
  const duplicateItemIndexes: number[] = [];

  for (const [index, item] of items.entries()) {
    // Fix all incorrectly named items
    const fixedName = trimAndUppercase(item.name);
    if (fixedName !== item.name) {
      await rename(item.name, fixedName);
      item.name = fixedName;
    }

    if (disoceveredItemNames.has(item.name)) {
      duplicateItemIndexes.push(index);
    }

    disoceveredItemNames.add(item.name);
  }

  // Remove duplicate items, but from the back so that we don't change
  // the position of the next item to remove on every iteration.
  duplicateItemIndexes.reverse();
  for (const index of duplicateItemIndexes) {
    await removeDuplicates(items[index].name);
    items.splice(index, 1);
  }

  return items;
}

export const setChecked = createAction(async (name: string, check: boolean) => {
  const page = await getPage();

  const checkbox = await page.$(
    `ul[aria-label="Min inköpslista"] > li input[aria-label="${name}"]`,
  );

  if (checkbox) {
    const isChecked = await checkbox.evaluate((el) => el.checked);

    if ((isChecked && !check) || (!isChecked && check)) await checkbox.click();
  }

  await page.waitForNetworkIdle();
});

export const rename = createAction(async (oldName: string, newName: string) => {
  // There's a bug where Google's app unchecks items when you rename them,
  // but it's not visible until you reload the page.
  // TODO: Work around by limiting renames to unchecked items.

  const page = await getPage();

  const [nameDisplay] = (await page.$x(
    `//ul/li//div[@role="button" and text()="${oldName}"]`,
  )) as [ElementHandle<HTMLDivElement>];
  await nameDisplay.click();

  await Promise.all([...oldName].map(() => nameDisplay.press("Backspace")));
  await nameDisplay.type(newName);

  // Press the submit button, one tab away from the input field
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await page.waitForNetworkIdle();
});

export const removeDuplicates = createAction(async (name: string) => {
  const page = await getPage();

  const nameDisplays = (await page.$x(
    `//ul/li//div[@role="button" and text()="${name}"]`,
  )) as ElementHandle<HTMLDivElement>[];

  nameDisplays.shift();

  console.log(`Removing ${nameDisplays.length} duplicate(s) of ${name}`);
  for (const nameDisplay of nameDisplays) {
    await nameDisplay.click();

    // Press the trash button, two tabs away from the input field
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await page.waitForNetworkIdle();
  }
});

export const removeItem = createAction(async (name: string) => {
  console.log(`Removing item ${name}`);
  const page = await getPage();

  const [nameDisplay] = (await page.$x(
    `//ul/li//div[@role="button" and text()="${name}"]`,
  )) as [ElementHandle<HTMLDivElement>];
  await nameDisplay.click();

  // Press the trash button, two tabs away from the input field
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await page.waitForNetworkIdle();
});

export const addItem = createAction(async (name: string) => {
  const page = await getPage();

  const newItemInput = (await page.$('input[aria-label="Lägg till objekt"]'))!;

  await newItemInput.type(name);
  await newItemInput.press("Enter");

  await page.waitForNetworkIdle();
});

export const clearCheckedItems = createAction(async () => {
  const page = await getPage();

  const moreButton = await page.$("button[aria-label='Mer']");
  await moreButton?.click();

  // Wait for the menu to fully open
  await pause(200);

  // Navigate to third menu item and press it
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  // Wait for modal to become visible
  await pause(200);

  // Accept default modal action
  await page.keyboard.press("Enter");

  await page.waitForNetworkIdle();
});

export const pause = (time = 2000) =>
  new Promise((resolve) => setTimeout(resolve, time));
