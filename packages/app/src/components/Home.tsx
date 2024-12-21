import { useConnectivitySignal } from "@solid-primitives/connectivity"
import {
	DragDropProvider,
	DragDropSensors,
	type DragEvent,
	DragOverlay,
	SortableProvider,
	closestCenter,
} from "@thisbeyond/solid-dnd"
import { Client, EventQueue, ShoppingList, type ShoppingListEvent, type ShoppingListItem, trimAndUppercase } from "lib"
import { animate } from "motion/mini"
import { For, type JSX, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js"
// import { createStore, reconcile } from "solid-js/store"
import { Motion, Presence } from "solid-motionone"
import { TransitionGroup } from "solid-transition-group"
import { ConnectionWarning } from "~/components/ConnectionWarning"
import { ItemRow } from "~/components/ItemRow"
// import { BrowserServerConnection } from "~/lib/browser-server-connection"
import { addItem, clearCheckedItems, moveItem, myShoppingList } from "~/lib/store"
import { isInputField } from "~/lib/type-guards"
import IconCaretRight from "~icons/radix-icons/caret-right"

// function createClient() {
// 	const [connectionStatus, setConnectionStatus] = createSignal({ authenticated: true, connected: true })

// 	const serverConnection = new BrowserServerConnection((value) => setConnectionStatus(value))

// 	const initialShoppingListString = localStorage.getItem("main-shopping-list")
// 	const initialShoppingList = initialShoppingListString
// 		? (JSON.parse(initialShoppingListString) as ShoppingListItem[])
// 		: []

// 	const [list, setStore] = createStore({ items: initialShoppingList })

// 	const shoppingList = new ShoppingList(structuredClone(initialShoppingList), (newList) => {
// 		setStore("items", reconcile(structuredClone(newList)))
// 		localStorage.setItem("main-shopping-list", JSON.stringify(newList))
// 	})

// 	const storedRemoteShoppingListCopyString = localStorage.getItem("remote-shopping-list")
// 	const storedRemoteShoppingListCopy = storedRemoteShoppingListCopyString
// 		? (JSON.parse(storedRemoteShoppingListCopyString) as ShoppingListItem[])
// 		: []
// 	const remoteShoppingListCopy = new ShoppingList(storedRemoteShoppingListCopy, (newList) => {
// 		localStorage.setItem("remote-shopping-list", JSON.stringify(newList))
// 	})

// 	const storedEventQueueString = localStorage.getItem("event-queue")
// 	const storedEventQueue = storedEventQueueString ? (JSON.parse(storedEventQueueString) as ShoppingListEvent[]) : []
// 	const eventQueue = new EventQueue<ShoppingListEvent>(storedEventQueue, (events) => {
// 		localStorage.setItem("event-queue", JSON.stringify(events))
// 	})

// 	const client = new Client({
// 		shoppingList,
// 		remoteShoppingListCopy,
// 		serverConnection,
// 		eventQueue,
// 	})

// 	const isOnline = useConnectivitySignal()

// 	createEffect(() => {
// 		if (isOnline()) client.connect()
// 		else serverConnection.disconnect()
// 	})

// 	return { connectionStatus, client, items: list.items }
// }

const ITEM_HEIGHT = 40
const ITEM_HEIGHT_PX = `${ITEM_HEIGHT}px`

export function Home(props: { softwareKeyboardShown: boolean }) {
	const sortedList = () => myShoppingList.toSorted((a, b) => a.position - b.position)

	const activeList = () => sortedList().filter((item) => !item.checked)
	const checkedList = () => sortedList().filter((item) => item.checked)

	const [showChecked, setShowChecked] = createSignal(false)

	const [activeItem, setActiveItem] = createSignal<ShoppingListItem | null>(null)

	const onDragStart = ({ draggable }: DragEvent) => {
		setActiveItem(draggable.data as ShoppingListItem)

		// Drop focus from any input field when we start dragging
		if (isInputField(document.activeElement)) {
			document.activeElement.blur()
		}
	}

	const onDragEnd = ({ draggable, droppable }: DragEvent) => {
		if (draggable && droppable) {
			const currentIds = ids()
			const fromIndex = currentIds.indexOf(draggable.id as string)
			const toIndex = currentIds.indexOf(droppable.id as string)

			const fromPosition = activeList()[fromIndex].position
			const toPosition = activeList()[toIndex].position

			if (fromIndex !== toIndex) {
				moveItem(draggable.id as string, { fromPosition, toPosition })
			}
		}
	}

	const ids = () => activeList().map((item) => item.id)

	const [scrollRef, setScrollRef] = createSignal<HTMLElement | null>(null)

	onMount(() => {
		let prevHeight = scrollRef()!.clientHeight

		const resizeObserver = new ResizeObserver((entries) => {
			const ref = scrollRef()
			if (!ref) return

			const newHeight = entries[0].contentRect.height
			ref.scrollTo({ top: ref.scrollTop + prevHeight - newHeight, behavior: "instant" })
			prevHeight = newHeight
		})

		resizeObserver.observe(scrollRef()!)

		onCleanup(() => resizeObserver.disconnect())
	})

	return (
		<>
			<div style={props.softwareKeyboardShown ? { display: "none" } : {}}>
				{/* <ConnectionWarning
					isAuthenticated={connectionStatus().authenticated}
					isConnected={connectionStatus().connected}
				/> */}
			</div>

			<div ref={setScrollRef} class="text-lg flex-1 overflow-auto">
				<DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
					<DragDropSensors />

					<ul class="flex flex-col">
						<SortableProvider ids={ids()}>
							<RowAnimator>
								<For each={activeList()}>{(item) => <ItemRow item={item} />}</For>
							</RowAnimator>
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
								<button
									type="button"
									class="flex items-center overflow-hidden"
									onClick={() => setShowChecked((v) => !v)}
								>
									<IconCaretRight
										class={`transition-transform duration-300 ${showChecked() ? "rotate-90" : "rotate-0"}`}
									/>

									<h2 class="ml-1">
										{checkedList().length === 1 ? "1 ticked item" : `${checkedList().length} ticked items`}
									</h2>
								</button>

								<button type="button" class="px-3 py-1" onClick={() => clearCheckedItems()}>
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
											<For each={checkedList()}>{(item) => <ItemRow item={item} />}</For>
										</RowAnimator>
									</Motion.ul>
								</Show>
							</Presence>
						</Motion.div>
					</Show>
				</Presence>
			</div>

			<NewItem onCreate={(name) => addItem(name)} />
		</>
	)
}

function RowAnimator(props: { children: JSX.Element }) {
	return (
		<TransitionGroup
			onBeforeEnter={(el) => {
				// @ts-expect-error This works...
				el.style.height = 0
				// @ts-expect-error This works...
				el.style.opacity = 0
			}}
			onEnter={(el, done) => {
				Promise.all([
					animate(el, { height: ITEM_HEIGHT_PX }, { duration: 0.2 }),
					animate(el, { opacity: 1 }, { duration: 0.3 }),
				]).then(done)
			}}
			onBeforeExit={(el) => {
				// @ts-expect-error This works...
				el.style.height = ITEM_HEIGHT_PX
				// @ts-expect-error This works...
				el.style.opacity = 1
			}}
			onExit={(el, done) => {
				Promise.all([
					animate(el, { height: 0 }, { duration: 0.2 }),
					animate(el, { opacity: 0 }, { duration: 0.3 }),
				]).then(done)
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
		const parsedValue = trimAndUppercase(value())
		if (parsedValue.length) props.onCreate(parsedValue)

		setValue("")
		inputField?.focus()
	}

	return (
		<form
			class="backdrop-blur bg-color1/40 px-2 pb-5 pt-1 border-t-4 border-opacity-10 border-color7 max-w-lg w-full flex flex-row"
			onSubmit={(event) => {
				event.preventDefault()
				submit()
			}}
		>
			<input
				ref={inputField}
				class="bg-color7/30 backdrop-blur max-w-lg h-14 pl-4 pr-20 rounded-xl flex-1 text-color12 placeholder:text-color11 focus:outline-none focus:ring-2 focus:ring-color5 transition-shadow ease-in-out duration-200"
				placeholder="Add new item..."
				value={value()}
				onInput={(event) => setValue(event.currentTarget.value)}
			/>

			<input
				type="submit"
				value="Add"
				class="bg-transparent px-4 h-14 rounded-r-xl text-color11 right-2 absolute focus:outline-none focus:ring-2 focus:ring-color5 transition-shadow ease-in-out duration-200"
			/>
		</form>
	)
}
