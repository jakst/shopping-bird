import { Motion, Presence } from "@motionone/solid";
import { createSignal, For, JSX, Show } from "solid-js";
import { useRouteData } from "solid-start";
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server";
import { REQUIRED_AUTH_HEADER } from "~/auth";
import { client } from "~/trpc";
import IconCheck from "~icons/ci/check";
import IconPlus from "~icons/ci/plus";
import IconTrash from "~icons/ci/trash-full";
import IconCaretRight from "~icons/radix-icons/caret-right";
import IconSync from "~icons/radix-icons/symbol";

export default function Shell() {
  return (
    <main class="mx-auto text-gray-700 max-w-lg">
      <div class="flex px-4 justify-between items-center content-center">
        <h1
          class="text-4xl py-4 text-sky-700 uppercase"
          style={{ "font-stretch": "condensed" }}
        >
          Hello Bird!
        </h1>

        <SyncButton />
      </div>

      <Home />
    </main>
  );
}

function SyncButton() {
  const [syncInProgress, sync] = createServerAction$(() =>
    client.sync.mutate(),
  );

  return (
    <Button onClick={sync}>
      <Motion.span
        animate={syncInProgress.pending ? { rotate: [0, 120, 360] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <IconSync height="100%" width="100%" />
      </Motion.span>
    </Button>
  );
}

export function routeData() {
  return createServerData$(
    (_, event) => {
      if (event.request.headers.get("authorization") !== REQUIRED_AUTH_HEADER) {
        throw redirect("/login");
      }

      return client.getShoppingList.query();
    },
    {
      initialValue: [],
    },
  );
}

type Item = Awaited<ReturnType<typeof client.getShoppingList.query>>[number];

function Home() {
  const shoppingList = useRouteData<typeof routeData>();

  const sortedList = () => {
    return shoppingList()!
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
    return shoppingList()!
      .filter((item) => item.checked)
      .sort((a, b) => a.index - b.index);
  };

  const [showChecked, setShowChecked] = createSignal(false);

  return (
    <div class="text-lg">
      <ul class="flex flex-col gap-2">
        <For each={sortedList()}>{(item) => <ItemC item={item} />}</For>

        <NewItem />
      </ul>

      <Show when={checkedList().length > 0}>
        <div class="mt-4 mb-2 ml-2 opacity-60">
          <button
            class="flex items-center overflow-hidden"
            onClick={() => setShowChecked((v) => !v)}
          >
            <IconCaretRight
              class={
                showChecked()
                  ? "duration-300 rotate-90"
                  : "duration-300 rotate-0"
              }
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
              animate={{ opacity: 1, transition: { duration: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <For each={checkedList()}>{(item) => <ItemC item={item} />}</For>
            </Motion.ul>
          </Show>
        </Presence>
      </Show>
    </div>
  );
}

function ItemC(props: { item: Item }) {
  const [isDisappearing, setIsDisappearing] = createSignal(false);
  const [hovering, setHovering] = createSignal(false);
  const [focusing, setFocusing] = createSignal(false);
  const showingActions = () => {
    return hovering() || focusing();
  };

  const [, setChecked] = createServerAction$(
    (input: { id: string; checked: boolean }) =>
      client.setChecked.mutate(input),
  );

  const [, removeItem] = createServerAction$((id: string) =>
    client.removeItem.mutate(id),
  );

  const [, rename] = createServerAction$(
    (input: { id: string; name: string }) => client.rename.mutate(input),
  );

  const [newName, setNewName] = createSignal(props.item.name);

  const nameHasChanged = () => newName() !== props.item.name;

  function submitNameChange() {
    rename({ id: props.item.id, name: newName() });
    setFocusing(false);
  }

  return (
    <Presence initial={false}>
      <Show when={!isDisappearing()}>
        <Motion.li
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          class="flex px-1 items-center justify-between"
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocusIn={() => setFocusing(true)}
          onFocusOut={(event) => {
            if (
              !(
                event.relatedTarget &&
                event.currentTarget.contains(event.relatedTarget as any)
              )
            ) {
              setFocusing(false);
            }
          }}
        >
          <div class="flex">
            <label class="p-3 h-10 aspect-square flex items-center justify-center">
              <input
                class="w-5 h-5 text-blue-600 bg-gray-100 rounded border-gray-300 "
                type="checkbox"
                checked={props.item.checked}
                onChange={(event) => {
                  const { id } = props.item;
                  const { checked } = event.currentTarget;

                  setIsDisappearing(true);
                  setTimeout(() => setChecked({ id, checked }), 500);
                }}
              />
            </label>

            <input
              value={props.item.name}
              class={`capitalize focus:outline-none focus:underline border-slate-800${
                props.item.checked
                  ? " line-through text-gray-500"
                  : " text-gray-900"
              }`}
              onInput={(event) => setNewName(event.currentTarget.value)}
            />
          </div>

          <Show when={showingActions()}>
            <div class="ml-6 mr-2 flex items-center">
              <Button disabled={!nameHasChanged()} onClick={submitNameChange}>
                <IconCheck height="100%" />
              </Button>

              <Button
                onClick={() => {
                  const { id } = props.item;

                  setIsDisappearing(true);
                  setTimeout(() => removeItem(id), 500);
                }}
              >
                <IconTrash height="100%" />
              </Button>
            </div>
          </Show>
        </Motion.li>
      </Show>
    </Presence>
  );
}

function Button(props: {
  onClick?: () => void;
  disabled?: boolean;
  children: JSX.Element;
}) {
  return (
    <button
      class="aspect-square h-7 flex items-center justify-center rounded-full enabled:hover:bg-slate-100 disabled:opacity-0"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

function NewItem() {
  let inputField: HTMLInputElement | undefined;
  const [value, setValue] = createSignal("");

  const [, addItem] = createServerAction$(async (name: string) => {
    return client.addItem.mutate(name);
  });

  function submit() {
    addItem(value());
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
