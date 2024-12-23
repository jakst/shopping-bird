import {
	DragDropProvider,
	DragDropSensors,
	type DragEvent,
	DragOverlay,
	SortableProvider,
	closestCenter,
} from "@thisbeyond/solid-dnd"
import type { ShoppingListItem } from "lib"
import { animate } from "motion/mini"
import { For, type JSX, Show, createSignal } from "solid-js"
import { Motion, Presence } from "solid-motionone"
import { TransitionGroup } from "solid-transition-group"
import { ItemRow } from "~/components/ItemRow"
import { isConnected, myShoppingList, shopping } from "~/lib/shopping-list"
import { isInputField } from "~/lib/type-guards"
import IconPlus from "~icons/ci/plus"
import IconCaretRight from "~icons/radix-icons/caret-right"
import { ConnectionWarning } from "./ConnectionWarning"

const ITEM_HEIGHT = 40
const ITEM_HEIGHT_PX = `${ITEM_HEIGHT}px`

export function Home() {
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
				shopping.moveItem(draggable.id as string, { fromPosition, toPosition })
			}
		}
	}

	const ids = () => activeList().map((item) => item.id)

	return (
		<>
			<ConnectionWarning isConnected={isConnected()} />

			<div class="text-lg flex-1 overflow-auto">
				<DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
					<DragDropSensors />

					<ul class="flex flex-col pb-2">
						<SortableProvider ids={ids()}>
							<RowAnimator>
								<For each={activeList()}>{(item) => <ItemRow item={item} />}</For>
							</RowAnimator>
						</SortableProvider>

						<button
							type="button"
							onClick={() => {
								shopping.addItem("")

								const inputs = document.querySelectorAll<HTMLInputElement>("input[data-checked=false]")
								const item = Array.from(inputs).at(-1)
								item?.focus()
							}}
							class="text-color10 font-light flex flex-row gap-2 items-center px-3 cursor-text h-10"
						>
							<IconPlus /> Add item
						</button>
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

								<button type="button" class="px-3 py-1" onClick={() => shopping.clearCheckedItems()}>
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
