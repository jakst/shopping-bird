import { createSignal, For, JSX, Show } from 'solid-js'
import { useRouteData } from 'solid-start'
import {
  createServerAction$,
  createServerData$,
  HttpHeader,
  HttpStatusCode,
  redirect,
} from 'solid-start/server'
import { REQUIRED_AUTH_HEADER } from '~/auth'
import { client } from '~/trpc'
import IconCheck from '~icons/ci/check'
import IconPlus from '~icons/ci/plus'
import IconTrash from '~icons/ci/trash-full'
import IconCaretRight from '~icons/radix-icons/caret-right'
import IconSync from '~icons/radix-icons/symbol'

export function routeData() {
  return createServerData$(
    (_, event) => {
      if (event.request.headers.get('authorization') !== REQUIRED_AUTH_HEADER)
        throw redirect('/login')

      return client.getShoppingList.query()
    },
    {
      initialValue: [],
    }
  )
}

type Item = Awaited<ReturnType<typeof client.getShoppingList.query>>[number]

export default function Home() {
  const shoppingList = useRouteData<typeof routeData>()

  const sortedList = () => {
    return shoppingList()!
      .filter((item) => !item.checked)
      .sort((a, b) => {
        if (a.checked && !b.checked) return 1
        else if (!a.checked && b.checked) return -1

        return a.index - b.index
      })
  }

  const checkedList = () => {
    return shoppingList()!
      .filter((item) => item.checked)
      .sort((a, b) => a.index - b.index)
  }

  const [showChecked, setShowChecked] = createSignal(false)

  const [, sync] = createServerAction$(() => client.sync.mutate())

  return (
    <main class="mx-auto text-gray-700 p-4 max-w-lg">
      <Show when={false}>
        <HttpHeader name="WWW-Authenticate" value="Basic" />
        <HttpStatusCode code={401} />
      </Show>

      <h1 class="text-center text-6xl text-sky-700 font-thin uppercase my-16">
        Hello Bird!
      </h1>

      <div class="flex justify-end">
        <Button onClick={() => sync()}>
          <IconSync />
        </Button>
      </div>

      <ul class="flex flex-col gap-2">
        <For each={sortedList()}>{(item) => <ItemC item={item} />}</For>

        <NewItem />
      </ul>

      <Show when={checkedList().length > 0}>
        <div class="mt-4 mb-2 ml-[-24px] opacity-60">
          <button
            class="flex items-center"
            onClick={() => setShowChecked((v) => !v)}
          >
            <IconCaretRight
              class={`transition-all duration-300 ${
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
    (input: { id: string; checked: boolean }) => client.setChecked.mutate(input)
  )

  const [, removeItem] = createServerAction$((id: string) =>
    client.removeItem.mutate(id)
  )

  const [, rename] = createServerAction$(
    (input: { id: string; name: string }) => client.rename.mutate(input)
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

          <Button onClick={() => removeItem(props.item.id)}>
            <IconTrash height="100%" />
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
      class="aspect-square h-7 flex items-center justify-center rounded-full enabled:hover:bg-slate-100 disabled:opacity-0"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}

function NewItem() {
  const [value, setValue] = createSignal('')

  const [, addItem] = createServerAction$(async (name: string) => {
    return client.addItem.mutate(name)
  })

  function submit() {
    addItem(value())
    setValue('')
  }

  return (
    <li class="text-sm h-7 flex items-center -mt-2">
      <IconPlus />

      <input
        class="ml-2 outline-none"
        placeholder="New item"
        value={value()}
        onInput={(event) => setValue(event.currentTarget.value)}
      />

      <Show when={value().length > 0}>
        <Button onClick={submit}>
          <IconCheck />
        </Button>
      </Show>
    </li>
  )
}
