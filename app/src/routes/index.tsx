import { createSignal, For, Show } from 'solid-js'
import { useRouteData } from 'solid-start'
import { createServerAction$, createServerData$ } from 'solid-start/server'
import { client } from '~/trpc'

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
        <button class="mt-6" onClick={() => setShowChecked((v) => !v)}>
          <h2>
            <span
              class={`inline-block transition-all ${
                showChecked() ? 'rotate-90' : 'rotate-0'
              }`}
            >
              {'>'}
            </span>{' '}
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
  const [, setChecked] = createServerAction$(
    async (input: { id: string; checked: boolean }) => {
      return client.setChecked.mutate(input)
    }
  )

  return (
    <li class="flex">
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
        <label
          class={
            'capitalize font-medium text-gray-900' +
            (props.item.checked ? ' line-through' : '')
          }
        >
          {props.item.name}
        </label>

        <Show when={false}>
          <p class="text-xs font-normal text-gray-500">NOTE_PLACEHOLDER</p>
        </Show>
      </div>
    </li>
  )
}
