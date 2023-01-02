import { Motion, Presence } from "@motionone/solid";
import {
  Client,
  EventQueue,
  ShoppingList,
  ShoppinglistEvent,
  ShoppingListItem,
  trimAndUppercase,
} from "hello-bird-lib";
import { nanoid } from "nanoid/non-secure";
import { createSignal, For, onMount, Show } from "solid-js";
import { createMutable, reconcile } from "solid-js/store";
import { ItemRow2 } from "~/components/ItemRow2";
import { BrowserServerConnection } from "~/lib/browser-server-connection";
import IconCheck from "~icons/ci/check";
import IconPlus from "~icons/ci/plus";
import IconCaretRight from "~icons/radix-icons/caret-right";
import { Button } from "../components/Button";

export default function Shell() {
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => setIsMounted(true));

  return (
    <main class="mx-auto text-gray-700 max-w-lg">
      <div class="flex px-4 justify-between items-center content-center">
        <h1
          class="uppercase text-4xl py-4 text-sky-700"
          style={{ "font-stretch": "condensed" }}
        >
          Hello Bird!
        </h1>
      </div>

      <Show when={isMounted()}>
        <Home />
      </Show>
    </main>
  );
}

function createClient() {
  const [isConnected, setIsConnected] = createSignal(false);
  const [isEventQueueEmpty, setIsEventQueueEmpty] = createSignal(true);

  const connectionStatus = () =>
    isConnected()
      ? isEventQueueEmpty()
        ? "IN_SYNC"
        : "OUT_OF_SYNC"
      : "OFFLINE";

  const serverConnection = new BrowserServerConnection((value) =>
    setIsConnected(value),
  );

  const initialShoppingList: ShoppingListItem[] = JSON.parse(
    localStorage.getItem("main-shopping-list") ?? "[]",
  );

  const list = createMutable({ items: initialShoppingList });

  const shoppingList = new ShoppingList([...initialShoppingList], (newList) => {
    // This updates the list without losing reactivity, but there could be more elegant ways to do it
    list.items = reconcile(newList)(list.items);
    localStorage.setItem("main-shopping-list", JSON.stringify(newList));
  });

  const remoteShoppingListCopy = new ShoppingList(
    JSON.parse(localStorage.getItem("remote-shopping-list") ?? "[]"),
    (newList) => {
      localStorage.setItem("remote-shopping-list", JSON.stringify(newList));
    },
  );

  const eventQueue = new EventQueue<ShoppinglistEvent>(
    JSON.parse(localStorage.getItem("event-queue") ?? "[]"),
    (events) => {
      setIsEventQueueEmpty(events.length === 0);
      localStorage.setItem("event-queue", JSON.stringify(events));
    },
  );

  const client = new Client({
    shoppingList,
    remoteShoppingListCopy,
    serverConnection,
    eventQueue,
  });

  // TODO: Handle connections either in client or fully through solid with reconnections
  client.connect();

  return { client, items: list.items, connectionStatus };
}

function Home() {
  const { client, items, connectionStatus } = createClient();

  function createItem(name: string) {
    client.applyEvent({ name: "ADD_ITEM", data: { id: nanoid(), name } });
  }

  function deleteItem(id: string) {
    client.applyEvent({ name: "DELETE_ITEM", data: { id } });
  }

  function setChecked(id: string, checked: boolean) {
    client.applyEvent({ name: "SET_ITEM_CHECKED", data: { id, checked } });
  }

  function renameItem(id: string, newName: string) {
    client.applyEvent({ name: "RENAME_ITEM", data: { id, newName } });
  }

  function clearCheckedItems() {
    client.applyEvent({ name: "CLEAR_CHECKED_ITEMS" });
  }

  const sortedList = () => {
    return items
      .filter((item) => !item.checked)
      .sort((a, b) => {
        // TODO: Sort by index
        // return a.index - b.index;
        return 0;
      });
  };

  const checkedList = () => {
    return items.filter((item) => item.checked);
  };

  const [showChecked, setShowChecked] = createSignal(false);

  const actions = {
    deleteItem,
    setChecked,
    renameItem,
  };

  return (
    <div class="text-lg">
      <style>
        {`
        .dot {
          position: absolute;
          border-radius: 50%;

          --yellow: #bbd028;
          --green: #1adf22;
        }

        .dot-online {
          top: 32px;
          left: 6px;

          width: 4px;
          height: 4px;

          background-color: var(--color);
          box-shadow:
            0 0 2px 1px var(--color),
            0 0 4px 2px var(--color);
        }

        .dot-offline {
          top: 31px;
          left: 5px;

          width: 7px;
          height: 7px;

          background-color: #ccc;
        }
        `}
      </style>

      <div
        class={
          connectionStatus() === "OFFLINE"
            ? "dot dot-offline"
            : "dot dot-online"
        }
        style={
          connectionStatus() === "IN_SYNC"
            ? "--color: var(--green)"
            : "--color: var(--yellow)"
        }
      />

      <ul class="flex flex-col gap-2">
        <For each={sortedList()}>
          {(item) => <ItemRow2 item={item} actions={actions} />}
        </For>

        <NewItem onCreate={createItem} />
      </ul>

      <Show when={checkedList().length > 0}>
        <div class="mt-4 mb-2 mx-2 opacity-60 flex justify-between">
          <button
            class="flex items-center overflow-hidden"
            onClick={() => setShowChecked((v) => !v)}
          >
            <IconCaretRight
              class={`transition-transform duration-300 ${
                showChecked() ? "rotate-90" : "rotate-0"
              }`}
            />

            <h2 class="ml-1">
              {checkedList().length === 1
                ? "1 ticked item"
                : `${checkedList().length} ticked items`}
            </h2>
          </button>

          <button class="px-3 py-1" onClick={() => clearCheckedItems()}>
            Clear all
          </button>
        </div>

        <Presence>
          <Show when={showChecked()}>
            <Motion.ul
              class="flex flex-col gap-2 opacity-60 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6, transition: { duration: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <For each={checkedList()}>
                {(item) => <ItemRow2 item={item} actions={actions} />}
              </For>
            </Motion.ul>
          </Show>
        </Presence>
      </Show>
    </div>
  );
}

function NewItem(props: { onCreate: (name: string) => void }) {
  let inputField: HTMLInputElement | undefined;
  const [value, setValue] = createSignal("");

  function submit() {
    props.onCreate(trimAndUppercase(value()));
    setValue("");
    inputField?.focus();
  }

  return (
    <li class="h-7 ml-3 flex items-center">
      <IconPlus />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputField}
          class="ml-2 outline-none text"
          placeholder="New item"
          value={value()}
          onInput={(event) => setValue(event.currentTarget.value)}
        />
      </form>

      <Show when={value().length > 0}>
        <Button onClick={submit}>
          <IconCheck />
        </Button>
      </Show>
    </li>
  );
}