import { createSignal, For, JSX, Show } from 'solid-js'
import { useRouteData } from 'solid-start'
import { createServerAction$, createServerData$ } from 'solid-start/server'
import { client } from '~/trpc'
import IconCaretRight from '~icons/ci/caret-right'
import IconCheck from '~icons/ci/check'
import IconCross from '~icons/ci/trash-full'

export function routeData() {
  return createServerData$(() => client.getShoppingList.query(), {
    initialValue: [],
  })
}

type Item = Awaited<ReturnType<typeof client.getShoppingList.query>>[number]

export default function Home() {
  const shoppingList = useRouteData<typeof routeData>()

  const sortedList = () => {
    return shoppingList()
      .filter((item) => !item.checked)
      .sort((a, b) => {
        if (a.checked && !b.checked) return 1
        else if (!a.checked && b.checked) return -1

        return a.index - b.index
      })
  }

  const checkedList = () => {
    return shoppingList()
      .filter((item) => item.checked)
      .sort((a, b) => a.index - b.index)
  }

  const [showChecked, setShowChecked] = createSignal(false)

  return (
    <main class="mx-auto text-gray-700 p-4 max-w-prose">
      <h1 class="text-center text-6xl text-sky-700 font-thin uppercase my-16">
        Hello world!
      </h1>
      <ul class="flex flex-col gap-2">
        <For each={sortedList()}>{(item) => <ItemC item={item} />}</For>
      </ul>

      <Show when={checkedList().length > 0}>
        <div class="mt-4 mb-2 ml-[-24px] opacity-60">
          <button
            class="flex items-center"
            onClick={() => setShowChecked((v) => !v)}
          >
            <IconCaretRight
              class={`transition-all ${
                showChecked() ? 'rotate-90' : 'rotate-0'
              }`}
            />

            <h2 class="ml-1 ">
              {checkedList().length === 1
                ? '1 ticked item'
                : `${checkedList().length} ticked items`}
            </h2>
          </button>
        </div>

        <Show when={showChecked()}>
          <ul class="flex flex-col gap-2 opacity-60">
            <For each={checkedList()}>{(item) => <ItemC item={item} />}</For>
          </ul>
        </Show>
      </Show>
    </main>
  )
}

function ItemC(props: { item: Item }) {
  const [hovering, setHovering] = createSignal(false)
  const [focusing, setFocusing] = createSignal(false)
  const showingActions = () => {
    return hovering() || focusing()
  }

  const [, setChecked] = createServerAction$(
    async (input: { id: string; checked: boolean }) => {
      return client.setChecked.mutate(input)
    }
  )

  const [, rename] = createServerAction$(
    async (input: { id: string; name: string }) => {
      return client.rename.mutate(input)
    }
  )

  const [newName, setNewName] = createSignal(props.item.name)

  const nameHasChanged = () => newName() !== props.item.name

  function submitNameChange() {
    rename({ id: props.item.id, name: newName() })
    setFocusing(false)
  }

  return (
    <li
      class="flex text-sm h-7"
      onMouseOver={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusIn={() => setFocusing(true)}
      onFocusOut={(event) => {
        if (
          !event.relatedTarget ||
          !event.currentTarget.contains(event.relatedTarget as any)
        )
          setFocusing(false)
      }}
    >
      <div class="flex items-center h-5">
        <input
          class="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 "
          type="checkbox"
          checked={props.item.checked}
          onChange={(event) => {
            setChecked({
              id: props.item.id,
              checked: event.currentTarget.checked,
            })
          }}
        />
      </div>

      <div class="ml-2">
        <input
          value={props.item.name}
          class={
            'capitalize font-medium focus:outline-none focus:border-b-[1px] border-slate-800' +
            (props.item.checked
              ? ' line-through text-gray-500'
              : ' text-gray-900')
          }
          onInput={(event) => setNewName(event.currentTarget.value)}
        />
      </div>

      <Show when={showingActions()}>
        <div class="ml-6 flex items-center">
          <Button disabled={!nameHasChanged()} onClick={submitNameChange}>
            <IconCheck height="100%" />
          </Button>

          <Button>
            <IconCross height="100%" />
          </Button>
        </div>
      </Show>
    </li>
  )
}

function Button(props: {
  onClick?: () => void
  disabled?: boolean
  children: JSX.Element
}) {
  return (
    <button
      class="aspect-square h-7 flex items-center justify-center rounded-full enabled:hover:bg-slate-100 disabled:opacity-60"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
