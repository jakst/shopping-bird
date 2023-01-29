import { writeFileSync } from "fs";
import { test } from "vitest";
import { createRandomString, setupTest } from "./test-utils/setupTest";

test("Random", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c1.client.connect();
  await c2.client.connect();

  const actionLog: string[] = [];
  async function assertRandomTest(i: number) {
    actionLog.push(`await setup.playOutListSync();\nsetup.assertEqualLists();`);
    await setup.playOutListSync();

    try {
      setup.assertEqualLists();
    } catch (e) {
      const logString = `ActionLog (${i} rounds, ${
        actionLog.length
      } actions)}:\n${actionLog.join("\n")}`;
      writeFileSync("action-log.txt", logString);
      console.log(logString);
      console.log("ServerShoppingList", setup.serverShoppingList.items);

      throw e;
    }
  }

  for (let i = 0; i < 100; i++) {
    for (const c of [c1, c2]) {
      const cString = c === c1 ? "c1" : "c2";

      if (c.serverConnection.isConnected) {
        if (Math.random() < 0.1) {
          actionLog.push(`${cString}.serverConnection.disconnect();`);
          c.serverConnection.disconnect();
        }
      } else {
        if (Math.random() < 0.3) {
          actionLog.push(`await ${cString}.client.connect();`);
          await c.client.connect();
        }
      }

      if (Math.random() < 0.5) {
        const random = Math.random();

        const randomItem =
          c.shoppingList.items[
            Math.floor(Math.random() * c.shoppingList.items.length)
          ];

        if (random < 1 / 5 || c.shoppingList.items.length < 1) {
          // Add item
          const name = createRandomString();
          actionLog.push(`await ${cString}.client.addItem("${name}");`);
          await c.client.addItem(name);
        } else if (random < 2 / 5) {
          // Delete item
          actionLog.push(
            `await ${cString}.client.deleteItem("${randomItem.id}");`,
          );
          await c.client.deleteItem(randomItem.id);
        } else if (random < 3 / 5) {
          // Rename item
          const newName = createRandomString();
          actionLog.push(
            `await ${cString}.client.renameItem("${randomItem.id}", "${newName}");`,
          );
          await c.client.renameItem(randomItem.id, newName);
        } else if (random < 4 / 5) {
          // Set item checked
          actionLog.push(
            `await ${cString}.client.setItemChecked("${
              randomItem.id
            }", ${!randomItem.checked});`,
          );
          await c.client.setItemChecked(randomItem.id, !randomItem.checked);
        } else if (random < 5 / 5) {
          // Clear checked items
          actionLog.push(`await ${cString}.client.clearCheckedItems();`);
          await c.client.clearCheckedItems();
        }
      }
    }

    if (Math.random() < 0.1) {
      const numberOfActions = Math.ceil(Math.random() * 5);

      for (let i = 0; i < numberOfActions; i++) {
        const random = Math.random();

        if (random < 2 / 4) {
          // Add item
          const item = {
            name: createRandomString(),
            checked: false,
          };
          actionLog.push(`setup.externalList.push(${JSON.stringify(item)});`);
          setup.externalList.push(item);
        } else if (random < 3 / 4) {
          // Remove item
          const i = Math.floor(Math.random() * setup.externalList.length);
          actionLog.push(`setup.externalList.splice(${i}, 1);`);
          setup.externalList.splice(i, 1);
        } else if (random < 4 / 4) {
          if (setup.externalList.length > 0) {
            // Set checked/unchecked
            const i = Math.floor(Math.random() * setup.externalList.length);
            const item = setup.externalList[i];
            actionLog.push(
              `setup.externalList[${i}].checked = ${!item.checked};`,
            );
            item.checked = !item.checked;
          }
        }
      }
    }

    if (Math.random() < 0.1) {
      await assertRandomTest(i);
    }
  }

  await assertRandomTest(-1);
});
