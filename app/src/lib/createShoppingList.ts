import { Action, compare, Item } from "hello-bird-lib";
import { createDb } from "./createDb";
import { createActionCreator, createActionSynchronizer } from "./handleActions";
import { client } from "./trpc";

export function createShoppingList() {
  const db = createDb("DB");
  const remoteDbCopy = createDb("REMOTE_DB");

  async function applyDbDiff(newDb: Item[]) {
    const actions = compare(remoteDbCopy.items, newDb);

    if (actions.length > 0) {
      console.log(
        `Applying ${
          actions.length === 1 ? "1 action" : `${actions.length} actions`
        } from remote DB`,
      );

      actions.map((action) => {
        db.applyAction(action);
        remoteDbCopy.applyAction(action);
      });
    }
  }

  async function syyync() {
    applyDbDiff(await client.pullDb.query());
  }

  // TODO: Schedule periodically and on reconnect etc
  syyync();

  const { sseId } = createActionSynchronizer(applyDbDiff);

  async function pushActions(actions: Action[]) {
    const _sseId = sseId();

    if (!_sseId) {
      return false;
    }

    try {
      await client.pushActions.mutate({ sseId: _sseId, actions });

      actions.forEach(remoteDbCopy.applyAction);

      console.log(
        `Successfully pushed ${
          actions.length === 1 ? "1 action" : `${actions.length} actions`
        } to server...`,
      );
      return true;
    } catch (error) {
      console.error("Failed to push actions.", error);
      return false;
    }
  }

  const createAction = createActionCreator(pushActions);

  return {
    items: db.items,
    connectionStatus: () => Boolean(sseId()),
    createItem: createAction("CREATE_ITEM", db.createItem),
    deleteItem: createAction("DELETE_ITEM", db.deleteItem),
    setChecked: createAction("SET_ITEM_CHECKED", db.setChecked),
    renameItem: createAction("RENAME_ITEM", db.renameItem),
  };
}
