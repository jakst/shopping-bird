import { createSignal, For, Show } from 'solid-js'
import { useRouteData } from 'solid-start'
import { createServerAction$, createServerData$ } from 'solid-start/server'
import { client } from '~/trpc'
import IconCaretRight from '~icons/radix-icons/caret-right'
import IconCross from '~icons/radix-icons/cross-2'

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
        <button
          class="mt-6 flex items-center"
          onClick={() => setShowChecked((v) => !v)}
        >
          <IconCaretRight
            class={`transition-all ${showChecked() ? 'rotate-90' : 'rotate-0'}`}
          />

          <h2>
            {checkedList().length === 1
              ? '1 ticked item'
              : `${checkedList().length} ticked items`}
          </h2>
        </button>

        <Show when={showChecked()}>
          <ul class="flex flex-col gap-2 cur">
            <For each={checkedList()}>{(item) => <ItemC item={item} />}</For>
          </ul>
        </Show>
      </Show>
    </main>
  )
}

function ItemC(props: { item: Item }) {
  const [showingActions, showActions] = createSignal()

  const [, setChecked] = createServerAction$(
    async (input: { id: string; checked: boolean }) => {
      return client.setChecked.mutate(input)
    }
  )

  return (
    <li
      class="flex"
      onFocusIn={() => showActions(true)}
      onFocusOut={() => setTimeout(() => showActions(false), 100)}
    >
      <div class="flex items-center h-5 rounded-lg">
        <input
          class="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300"
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

      <div class="ml-2 text-sm">
        <input
          value={props.item.name}
          class={
            'capitalize font-medium text-gray-900 focus:outline-none focus:border-none' +
            (props.item.checked ? ' line-through' : '')
          }
        />

        <Show when={true}>
          <p class="text-xs font-normal text-gray-500">
            For orders shipped from $25 in books or $29 in other categories
          </p>
        </Show>
      </div>

      <Show when={showingActions()}>
        <div>
          <button onClick={() => alert('hej')}>
            <IconCross />
          </button>
        </div>
      </Show>
    </li>
  )
}
