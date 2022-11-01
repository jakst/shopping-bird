import { For } from 'solid-js'
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

  return (
    <main class="text-center mx-auto text-gray-700 p-4 max-w-prose">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        Hello world!
      </h1>
      <For each={sortedList()}>{(item) => <ItemC item={item} />}</For>

      <div>Ticked items</div>
      <For each={checkedList()}>{(item) => <ItemC item={item} />}</For>
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
    <li class="flex row items-center justify-between w-full py-1 px-4 my-1 rounded border bg-gray-100 text-gray-600">
      <div class="items-center column">
        <label>
          <input
            class="mx-1"
            type="checkbox"
            checked={props.item.checked}
            onChange={(event) => {
              setChecked({
                id: props.item.id,
                checked: event.currentTarget.checked,
              })
            }}
          />

          <span class={props.item.checked ? 'line-through' : ''}>
            {props.item.name}
          </span>
        </label>
      </div>
      <div class="items-center row-reverse">
        <span
          class="px-4 py-2 float-right"
          // @click="$emit('remove', tarefa.id)"
        >
          {/* <i class="fas fa-times" /> */}X
        </span>
      </div>
    </li>
  )
}
