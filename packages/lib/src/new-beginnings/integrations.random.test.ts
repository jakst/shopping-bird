import { writeFileSync } from "fs";
import { test } from "vitest";
import { createRandomString } from "./integrations.test";
import { type ShoppingListEvent } from "./newSchemas";
import { setupTest } from "./test-utils/setupTest";

test("Random", async () => {
  const setup = setupTest();

  const c1 = setup.createClient();
  const c2 = setup.createClient();

  await c1.client.connect();
  await c2.client.connect();

  const eventWeights: [ShoppingListEvent["name"], number][] = [
    ["ADD_ITEM", 10],
    ["DELETE_ITEM", 3],
    ["RENAME_ITEM", 5],
    ["SET_ITEM_CHECKED", 10],
    ["CLEAR_CHECKED_ITEMS", 1],
  ];

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

  for (let i = 0; i < 40; i++) {
    for (const c of [c1, c2]) {
      const cString = c === c1 ? "c1" : "c2";

      if (c.serverConnection.isConnected) {
        if (Math.random() < 0.1) {
          // clientLog("disconnected");
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
        const eventName =
          c.shoppingList.items.length > 0
            ? eventWeights[Math.floor(Math.random() * eventWeights.length)][0]
            : "ADD_ITEM";

        const randomItem =
          c.shoppingList.items[
            Math.floor(Math.random() * c.shoppingList.items.length)
          ];

        let event: ShoppingListEvent | undefined;

        switch (eventName) {
          case "ADD_ITEM": {
            event = {
              name: eventName,
              data: { id: createRandomString(), name: createRandomString() },
            };

            break;
          }

          case "DELETE_ITEM": {
            event = {
              name: eventName,
              data: { id: randomItem.id },
            };

            break;
          }

          case "RENAME_ITEM": {
            event = {
              name: eventName,
              data: { id: randomItem.id, newName: createRandomString() },
            };

            break;
          }

          case "SET_ITEM_CHECKED": {
            event = {
              name: eventName,
              data: { id: randomItem.id, checked: !randomItem.checked },
            };

            break;
          }

          case "CLEAR_CHECKED_ITEMS": {
            if (c.shoppingList.items.some(({ checked }) => checked)) {
              event = { name: eventName };
            }
            break;
          }
        }

        if (event) {
          // clientLog(`event: ${JSON.stringify(event)}`);
          actionLog.push(
            `await ${cString}.client.applyEvent(${JSON.stringify(event)});`,
          );
          await c.client.applyEvent(event);
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
          actionLog.push(`setup.backendList.push(${JSON.stringify(item)});`);
          setup.backendList.push(item);
        } else if (random < 3 / 4) {
          // Remove item
          const i = Math.floor(Math.random() * setup.backendList.length);
          actionLog.push(`setup.backendList.splice(${i}, 1);`);
          setup.backendList.splice(i, 1);
        } else if (random < 4 / 4) {
          if (setup.backendList.length > 0) {
            // Set checked/unchecked
            const i = Math.floor(Math.random() * setup.backendList.length);
            const item = setup.backendList[i];
            actionLog.push(
              `setup.backendList[${i}].checked = ${!item.checked};`,
            );
            item.checked = !item.checked;
          }
        }
      }
    }

    if (Math.random() < 0.05) {
      await assertRandomTest(i);
    }
  }

  await assertRandomTest(-1);
});
