import { createEffect, For } from 'solid-js'
import { useRouteData } from 'solid-start'
import { createServerAction$, createServerData$ } from 'solid-start/server'
import { client } from '~/trpc'

export function routeData() {
  return createServerData$(() => client.getShoppingList.query())
}

export default function Home() {
  const shoppingList = useRouteData<typeof routeData>()

  const [lll, setChecked] = createServerAction$(
    async (input: { id: string; checked: boolean }) => {
      return client.setChecked.mutate(input)
    }
  )

  createEffect(() => console.log(lll.input))

  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        Hello world!
      </h1>

      <For each={shoppingList()}>
        {(item) => (
          <li class="flex row items-center justify-between w-full py-1 px-4 my-1 rounded border bg-gray-100 text-gray-600">
            <div class="items-center column">
              <label>
                <input
                  class="mx-1"
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    setChecked({
                      id: item.id,
                      checked: event.currentTarget.checked,
                    })
                  }
                />

                <span class={item.checked ? 'line-through' : ''}>
                  {item.name}
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
        )}
      </For>
    </main>
  )
}
