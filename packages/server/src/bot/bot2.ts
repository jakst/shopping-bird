import { trimAndUppercase, type BackendClientBot } from "hello-bird-lib";
import { ElementHandle, Page } from "puppeteer";
import { clearCookies, getPage } from "./browser";

export async function createBot(): Promise<BackendClientBot> {
  const page = await getPage();

  return {
    async getList() {
      await goToShoppingListPage(page);
      const list = await getList(page);

      return list;
    },
    async ADD_ITEM(name: string) {
      const newItemInput = (await page.$(
        'input[aria-label="Lägg till objekt"]',
      ))!;

      await newItemInput.type(name);
      await newItemInput.press("Enter");

      await page.waitForNetworkIdle();
    },
    async DELETE_ITEM(name: string) {
      console.log(`Removing item ${name}`);

      const [nameDisplay] = (await page.$x(
        `//ul/li//div[@role="button" and text()="${name}"]`,
      )) as [ElementHandle<HTMLDivElement>];
      await nameDisplay.click();

      // Press the trash button, two tabs away from the input field
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");

      await page.waitForXPath('//*[text()="Varan har raderats"]');

      // await page.waitForNetworkIdle();
      console.log(`f ${name}`);
    },
    async RENAME_ITEM(oldName: string, newName: string) {
      await rename(page, oldName, newName);
    },
    async SET_ITEM_CHECKED(name: string, value: boolean) {
      const checkbox = await page.$(
        `ul[aria-label="Min inköpslista"] > li input[aria-label="${name}"]`,
      );

      if (checkbox) {
        const isChecked = await checkbox.evaluate((el) => el.checked);

        if ((isChecked && !value) || (!isChecked && value)) {
          await checkbox.click();
          await page.waitForNetworkIdle();
        }
      }
    },
  };
}

async function goToShoppingListPage(page: Page) {
  if (page.url() !== "https://shoppinglist.google.com/") {
    await page.goto("https://shoppinglist.google.com/", {
      waitUntil: "networkidle2",
    });
  } else {
    await page.reload({ waitUntil: "networkidle2" });
  }

  const isLoggedIn =
    (await page.$x('//*[contains(text(), "Min inköpslista")]')).length > 0;

  if (!isLoggedIn) {
    await clearCookies();
    throw new Error("You need to authenticate");
  }
}

async function getList(page: Page) {
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
  const duplicateNames = new Set<string>();
  const duplicateIndexes: number[] = [];

  for (const [index, item] of items.entries()) {
    // Fix all incorrectly named items
    const fixedName = trimAndUppercase(item.name);
    if (fixedName !== item.name) {
      console.log(
        `[BOT]: Renaming incorrectly named item from "${item.name}" to "${fixedName}"`,
      );
      await rename(page, item.name, fixedName);
      item.name = fixedName;
    }

    if (disoceveredItemNames.has(item.name.toLowerCase())) {
      duplicateNames.add(item.name);
      duplicateIndexes.push(index);
    } else {
      disoceveredItemNames.add(item.name.toLowerCase());
    }
  }

  for (const duplicateName of duplicateNames) {
    await removeDuplicates(page, duplicateName);
  }

  // Remove duplicate items, but from the back so that we don't change
  // the position of the next item to remove on every iteration.
  duplicateIndexes.reverse();
  duplicateIndexes.forEach((index) => items.splice(index, 1));

  return items;
}

async function rename(page: Page, oldName: string, newName: string) {
  // There's a bug where Google's app unchecks items when you rename them,
  // but it's not visible until you reload the page.
  // TODO: Work around by limiting renames to unchecked items.

  console.log(`[BOT]: Renaming item from "${oldName}" to "${newName}"`);
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
}

async function removeDuplicates(page: Page, name: string) {
  // Find names case insensitively
  const nameDisplays = (await page.$x(
    `//ul/li//div[
      @role="button"
    and
      text()[contains(
        translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ', 'abcdefghijklmnopqrstuvwxyzåäö'),
        '${name.toLowerCase()}'
      )]
    ]`,
  )) as ElementHandle<HTMLDivElement>[];

  // We want to keep one item, so shift the first one out of the list
  nameDisplays.shift();

  console.log(
    `[BOT]: Removing ${nameDisplays.length} duplicate(s) of item "${name}"`,
  );
  for (const nameDisplay of nameDisplays) {
    await nameDisplay.click();

    // Press the trash button, two tabs away from the input field
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await page.waitForNetworkIdle();
  }
}
