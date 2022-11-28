import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { usePageVisibility } from "@solid-primitives/page-visibility";
import {
  actionSchema,
  dbSchema,
  Item,
  type Action,
  type GetActionData,
} from "hello-bird-lib";
import { createEffect, createSignal } from "solid-js";
import { env } from "./env";
import { getStoredActions, persistActions } from "./storage";

export function createActionSynchronizer(
  onDbRecieved: (items: Item[]) => void,
) {
  const networkIsOnline = useConnectivitySignal();
  const pageIsVisible = usePageVisibility();

  const [sseId, setSseId] = createSignal<string | null>(null);

  let eventSource: EventSource | null = null;

  createEffect(() => {
    if (networkIsOnline() && pageIsVisible()) {
      eventSource = new EventSource(`${env.BACKEND_URL}/sse`);

      eventSource.addEventListener("sse-id", (event: MessageEvent<string>) => {
        setSseId(event.data);
      });

      eventSource.addEventListener("error", () => {
        if (sseId()) setSseId(null);
      });

      eventSource.addEventListener("db-update", (event) => {
        const action = dbSchema.parse(JSON.parse(event.data));
        onDbRecieved(action);
      });
    } else if (eventSource) {
      eventSource.close();
    }
  });

  return { sseId };
}

export function createActionCreator(
  pushActions: (action: Action[]) => Promise<boolean>,
) {
  const [actionList, setActionList] = createSignal(getStoredActions());
  createEffect(() => persistActions(actionList()));

  createEffect(async () => {
    const actionsToSync = actionList();

    if (actionsToSync.length > 0 && (await pushActions(actionsToSync))) {
      setActionList((prev) =>
        prev.filter((action) => !actionsToSync.includes(action)),
      );
    }
  });

  function createAction<Name extends Action["name"], Args extends any[]>(
    name: Name,
    callback: (...props: Args) => GetActionData<Name>,
  ) {
    return (...props: Args) => {
      const data = callback(...props);

      const action = actionSchema.parse({ name, data });
      setActionList((prev) => [...prev, action]);
    };
  }

  return createAction;
}
