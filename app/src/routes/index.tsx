import { Motion, Presence } from "@motionone/solid";
import { createSignal, For, onMount, Show } from "solid-js";
import { createShoppingList } from "~/lib/createShoppingList";
import IconCheck from "~icons/ci/check";
import IconPlus from "~icons/ci/plus";
import IconCaretRight from "~icons/radix-icons/caret-right";
import { Button } from "../components/Button";
import { ItemRow } from "../components/ItemRow";

export default function Shell() {
  const [isMounted, setIsMounted] = createSignal(false);
  onMount(() => setIsMounted(true));

  return (
    <main class="mx-auto text-gray-700 max-w-lg">
      <div class="flex px-4 justify-between items-center content-center">
        <h1
          class="text-4xl py-4 text-sky-700 uppercase"
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

function Home() {
  const {
    items,
    connectionStatus,
    createItem,
    deleteItem,
    setChecked,
    renameItem,
  } = createShoppingList();

  const rowActions = { deleteItem, renameItem, setChecked };

  const sortedList = () => {
    return items
      .filter((item) => !item.checked)
      .sort((a, b) => {
        if (a.checked && !b.checked) {
          return 1;
        } else if (!a.checked && b.checked) {
          return -1;
        }

        return a.index - b.index;
      });
  };

  const checkedList = () => {
    return items
      .filter((item) => item.checked)
      .sort((a, b) => a.index - b.index);
  };

  const [showChecked, setShowChecked] = createSignal(false);

  return (
    <div class="text-lg">
      <div
        class={`w-2 h-2 ${connectionStatus() ? "bg-green-800" : "bg-gray-400"}`}
      />
      <ul class="flex flex-col gap-2">
        <For each={sortedList()}>
          {(item) => <ItemRow item={item} actions={rowActions} />}
        </For>

        <NewItem onCreate={createItem} />
      </ul>

      <Show when={checkedList().length > 0}>
        <div class="mt-4 mb-2 ml-2 opacity-60">
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
                {(item) => <ItemRow item={item} actions={rowActions} />}
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
    props.onCreate(value());
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
