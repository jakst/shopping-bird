import { Motion, Presence } from "@motionone/solid"
import { Client, EventQueue, ShoppingList, ShoppingListEvent, ShoppingListItem, trimAndUppercase } from "lib"
import { timeline } from "motion"
import { createSignal, For, JSX, onMount, Show } from "solid-js"
import { createMutable, reconcile } from "solid-js/store"
import { TransitionGroup } from "solid-transition-group"
import { ItemRow } from "~/components/ItemRow"
import { BrowserServerConnection } from "~/lib/browser-server-connection"
import IconCheck from "~icons/ci/check"
import IconPlus from "~icons/ci/plus"
import IconCaretRight from "~icons/radix-icons/caret-right"
import { Button } from "../components/Button"

export default function Shell() {
	const [isMounted, setIsMounted] = createSignal(false)

	onMount(() => setIsMounted(true))

	return (
		<main class="mx-auto text-gray-700 max-w-lg">
			<div class="flex px-4 py-4 justify-between items-center content-center">
				<img src="/header-logo.svg" alt="Shopping bird logo containing a bird riding in a shopping cart" />
			</div>

			<Show when={isMounted()}>
				<Home />
			</Show>
		</main>
	)
}

function createClient() {
	const [isConnected, setIsConnected] = createSignal(false)
	const [isEventQueueEmpty, setIsEventQueueEmpty] = createSignal(true)

	const connectionStatus = () => (isConnected() ? (isEventQueueEmpty() ? "IN_SYNC" : "OUT_OF_SYNC") : "OFFLINE")

	const serverConnection = new BrowserServerConnection((value) => setIsConnected(value))

	const initialShoppingList: ShoppingListItem[] = JSON.parse(localStorage.getItem("main-shopping-list") ?? "[]")

	const list = createMutable({ items: initialShoppingList })

	const shoppingList = new ShoppingList([...initialShoppingList], (newList) => {
		// This updates the list without losing reactivity, but there could be more elegant ways to do it.
		// The reason we do this big changed/added/removed check is because a reconcile on the whole list
		// does not maintain referential identity of objects coming after a deleted item.
		newList.forEach((newItem) => {
			const existingItemIndex = list.items.findIndex((v) => v.id === newItem.id)

			if (existingItemIndex > -1) {
				// Changes to existing item
				list.items[existingItemIndex] = reconcile(newItem)(list.items[existingItemIndex])
			} else {
				// Item added
				list.items.push(newItem)
			}
		})

		list.items.forEach((v, i) => {
			// Item removed
			if (!newList.some((newItem) => newItem.id === v.id)) list.items.splice(i, 1)
		})

		localStorage.setItem("main-shopping-list", JSON.stringify(newList))
	})

	const remoteShoppingListCopy = new ShoppingList(
		JSON.parse(localStorage.getItem("remote-shopping-list") ?? "[]"),
		(newList) => {
			localStorage.setItem("remote-shopping-list", JSON.stringify(newList))
		},
	)

	const eventQueue = new EventQueue<ShoppingListEvent>(
		JSON.parse(localStorage.getItem("event-queue") ?? "[]"),
		(events) => {
			setIsEventQueueEmpty(events.length === 0)
			localStorage.setItem("event-queue", JSON.stringify(events))
		},
	)

	const client = new Client({
		shoppingList,
		remoteShoppingListCopy,
		serverConnection,
		eventQueue,
	})

	// TODO: Handle connections either in client or fully through solid with reconnections
	client.connect()

	return { client, items: list.items, connectionStatus }
}

const ITEM_HEIGHT = 40
const ITEM_HEIGHT_PX = `${ITEM_HEIGHT}px`

function Home() {
	const { client, items, connectionStatus } = createClient()

	const sortedList = () => {
		return items
			.filter((item) => !item.checked)
			.sort((a, b) => {
				// TODO: Sort by index
				// return a.index - b.index;
				return 0
			})
	}

	const checkedList = () => {
		return items.filter((item) => item.checked)
	}

	const [showChecked, setShowChecked] = createSignal(false)

	const actions = {
		deleteItem: client.deleteItem.bind(client),
		setChecked: client.setItemChecked.bind(client),
		renameItem: client.renameItem.bind(client),
	}

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
				class={connectionStatus() === "OFFLINE" ? "dot dot-offline" : "dot dot-online"}
				style={connectionStatus() === "IN_SYNC" ? "--color: var(--green)" : "--color: var(--yellow)"}
			/>

			<ul class="flex flex-col">
				<Flerp>
					<For each={sortedList()}>
						{(item) => (
							// {/* TODO: remove wrapper */}
							<div class="overflow-hidden">
								<ItemRow item={item} actions={actions} />
							</div>
						)}
					</For>
				</Flerp>

				<NewItem onCreate={(name) => void client.addItem(name)} />
			</ul>

			<Presence initial={false}>
				<Show when={checkedList().length > 0}>
					<Motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}>
						<div class="mt-4 mb-2 mx-2 flex justify-between">
							<button class="flex items-center overflow-hidden" onClick={() => setShowChecked((v) => !v)}>
								<IconCaretRight
									class={`transition-transform duration-300 ${showChecked() ? "rotate-90" : "rotate-0"}`}
								/>

								<h2 class="ml-1">
									{checkedList().length === 1 ? "1 ticked item" : `${checkedList().length} ticked items`}
								</h2>
							</button>

							<button class="px-3 py-1" onClick={() => void client.clearCheckedItems()}>
								Clear all
							</button>
						</div>

						<Presence>
							<Show when={showChecked()}>
								<Motion.ul
									class="flex flex-col overflow-hidden"
									animate={{ height: [0, `${checkedList().length * ITEM_HEIGHT}px`, null], opacity: [0, 0, 1] }}
									exit={{ height: [null, null, 0], opacity: [null, 0, 0] }}
									transition={{ duration: 0.7 }}
								>
									<For each={checkedList()}>{(item) => <ItemRow item={item} actions={actions} />}</For>
								</Motion.ul>
							</Show>
						</Presence>
					</Motion.div>
				</Show>
			</Presence>
		</div>
	)
}

function Flerp(props: { children: JSX.Element }) {
	return (
		<TransitionGroup
			onBeforeEnter={(el) => {
				// @ts-expect-error This works...
				;(el.style.height = 0), (el.style.opacity = 0)
			}}
			onEnter={(el, done) => {
				timeline([
					[el, { height: ITEM_HEIGHT_PX }, { duration: 0.3 }],
					[el, { opacity: 1 }, { duration: 0.5 }],
				]).finished.then(done)
			}}
			onBeforeExit={(el) => {
				// @ts-expect-error This works...
				;(el.style.height = ITEM_HEIGHT_PX), (el.style.opacity = 1)
			}}
			onExit={(el, done) => {
				timeline(
					[
						[el, { opacity: 0 }, { duration: 0.3 }],
						[el, { height: 0 }, { duration: 0.3 }],
					],
					// { duration },
				).finished.then(done)
			}}
		>
			{props.children}
		</TransitionGroup>
	)
}

function NewItem(props: { onCreate: (name: string) => void }) {
	let inputField: HTMLInputElement | undefined
	const [value, setValue] = createSignal("")

	function submit() {
		props.onCreate(trimAndUppercase(value()))
		setValue("")
		inputField?.focus()
	}

	return (
		<li class="h-7 ml-3 pr-2 flex items-center">
			<IconPlus />

			<form
				class="flex-1"
				onSubmit={(event) => {
					event.preventDefault()
					submit()
				}}
			>
				<input
					ref={inputField}
					class="ml-2 outline-none text flex-1"
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
	)
}
