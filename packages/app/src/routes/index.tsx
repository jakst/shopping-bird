import { Motion, Presence } from "@motionone/solid"
import {
	closestCenter,
	DragDropProvider,
	DragDropSensors,
	DragOverlay,
	SortableProvider,
	type DragEvent,
} from "@thisbeyond/solid-dnd"
import { Client, EventQueue, ShoppingList, ShoppingListEvent, ShoppingListItem, trimAndUppercase } from "lib"
import { timeline } from "motion"
import { createSignal, For, JSX, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { TransitionGroup } from "solid-transition-group"
import { ClientOnly } from "~/components/ClientOnly"
import { ItemRow } from "~/components/ItemRow"
import { BrowserServerConnection } from "~/lib/browser-server-connection"
import IconCheck from "~icons/ci/check"
import IconPlus from "~icons/ci/plus"
import IconCaretRight from "~icons/radix-icons/caret-right"
import { Button } from "../components/Button"

export default function Shell() {
	return (
		<main class="mx-auto text-color12 max-w-lg">
			<div class="flex px-4 py-4 justify-between items-center content-center">
				<img src="/header-logo.svg" alt="Shopping bird logo containing a bird riding in a shopping cart" />
			</div>

			<ClientOnly>
				<Home />
			</ClientOnly>
		</main>
	)
}

function createClient() {
	const [isConnected, setIsConnected] = createSignal(false)
	const [isEventQueueEmpty, setIsEventQueueEmpty] = createSignal(true)

	const connectionStatus = () => (isConnected() ? (isEventQueueEmpty() ? "IN_SYNC" : "OUT_OF_SYNC") : "OFFLINE")

	const serverConnection = new BrowserServerConnection((value) => setIsConnected(value))

	const initialShoppingListString = localStorage.getItem("main-shopping-list")
	const initialShoppingList = initialShoppingListString
		? (JSON.parse(initialShoppingListString) as ShoppingListItem[])
		: []

	const [list, setStore] = createStore({ items: initialShoppingList })

	const shoppingList = new ShoppingList(structuredClone(initialShoppingList), (newList) => {
		setStore("items", reconcile(structuredClone(newList)))
		localStorage.setItem("main-shopping-list", JSON.stringify(newList))
	})

	const asd = [1, null].filter(Boolean).map((v) => v * 2)

	const storedRemoteShoppingListCopyString = localStorage.getItem("remote-shopping-list")
	const storedRemoteShoppingListCopy = storedRemoteShoppingListCopyString
		? (JSON.parse(storedRemoteShoppingListCopyString) as ShoppingListItem[])
		: []
	const remoteShoppingListCopy = new ShoppingList(storedRemoteShoppingListCopy, (newList) => {
		localStorage.setItem("remote-shopping-list", JSON.stringify(newList))
	})

	const storedEventQueueString = localStorage.getItem("event-queue")
	const storedEventQueue = storedEventQueueString ? (JSON.parse(storedEventQueueString) as ShoppingListEvent[]) : []
	const eventQueue = new EventQueue<ShoppingListEvent>(storedEventQueue, (events) => {
		setIsEventQueueEmpty(events.length === 0)
		localStorage.setItem("event-queue", JSON.stringify(events))
	})

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
			.map((item, index) => [index, item] as const)
			.sort(([aIndex, a], [bIndex, b]) => {
				// Fall back to index for legacy items without a position
				const posA = a.position ?? aIndex
				const posB = b.position ?? bIndex

				return posA - posB
			})
			.map(([, item]) => item)
	}

	const activeList = () => sortedList().filter((item) => !item.checked)
	const checkedList = () => sortedList().filter((item) => item.checked)

	const [showChecked, setShowChecked] = createSignal(false)

	const actions = {
		deleteItem: client.deleteItem.bind(client),
		setChecked: client.setItemChecked.bind(client),
		renameItem: client.renameItem.bind(client),
	}

	const [activeItem, setActiveItem] = createSignal<ShoppingListItem | null>(null)

	const onDragStart = ({ draggable }: DragEvent) => {
		setActiveItem(draggable.data as ShoppingListItem)
	}

	const onDragEnd = ({ draggable, droppable }: DragEvent) => {
		if (draggable && droppable) {
			const currentIds = ids()
			const fromIndex = currentIds.indexOf(draggable.id as string)
			const toIndex = currentIds.indexOf(droppable.id as string)

			const fromPosition = activeList()[fromIndex].position ?? fromIndex
			const toPosition = activeList()[toIndex].position ?? toIndex

			if (fromIndex !== toIndex) {
				client.moveItem(draggable.id as string, { fromPosition, toPosition })
			}
		}
	}

	const ids = () => activeList().map(({ id }) => id)

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

			<DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
				<DragDropSensors />

				<ul class="flex flex-col">
					<SortableProvider ids={ids()}>
						<RowAnimator>
							<For each={activeList()}>{(item) => <ItemRow item={item} actions={actions} />}</For>
						</RowAnimator>

						<NewItem onCreate={(name) => void client.addItem(name)} />
					</SortableProvider>
				</ul>

				<Presence>
					<DragOverlay>
						<Motion.div
							exit={{ opacity: 0 }}
							style={{ height: ITEM_HEIGHT_PX, "padding-left": ITEM_HEIGHT_PX }}
							class="flex items-center shadow-md bg-color1 border-color6 text-color12 text-lg border-[0.5px] rounded-lg"
						>
							{activeItem()?.name}
						</Motion.div>
					</DragOverlay>
				</Presence>
			</DragDropProvider>

			<Presence initial={false}>
				<Show when={checkedList().length > 0}>
					<Motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}>
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

						<Presence exitBeforeEnter>
							<Show when={showChecked()}>
								<Motion.ul
									class="flex flex-col overflow-hidden"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1, transition: { duration: 0.5 } }}
									exit={{ opacity: 0, transition: { duration: 0.2 } }}
								>
									<RowAnimator>
										<For each={checkedList()}>{(item) => <ItemRow item={item} actions={actions} />}</For>
									</RowAnimator>
								</Motion.ul>
							</Show>
						</Presence>
					</Motion.div>
				</Show>
			</Presence>
		</div>
	)
}

function RowAnimator(props: { children: JSX.Element }) {
	return (
		<TransitionGroup
			onBeforeEnter={(el) => {
				// @ts-expect-error This works...
				;(el.style.height = 0), (el.style.opacity = 0)
			}}
			onEnter={(el, done) => {
				timeline([
					[el, { height: ITEM_HEIGHT_PX }, { duration: 0.2 }],
					[el, { opacity: 1 }, { duration: 0.3 }],
				]).finished.then(done)
			}}
			onBeforeExit={(el) => {
				// @ts-expect-error This works...
				;(el.style.height = ITEM_HEIGHT_PX), (el.style.opacity = 1)
			}}
			onExit={(el, done) => {
				timeline([
					[el, { opacity: 0 }, { duration: 0.3 }],
					[el, { height: 0 }, { duration: 0.2 }],
				]).finished.then(done)
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
		<li class="h-7 ml-3 pr-2 flex items-center text-color11">
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
					class="ml-2 outline-none flex-1 bg-transparent text-color12 placeholder:text-color11 "
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
