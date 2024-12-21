import { createSortable, transformStyle, useDragDropContext } from "@thisbeyond/solid-dnd"
import type { ShoppingListItem } from "lib"
import { Show, batch, createSignal } from "solid-js"
import { deleteItem, renameItem, setItemChecked } from "~/lib/store"
import IconPadding from "~icons/ci/drag-vertical"
import IconTrash from "~icons/ci/trash-full"
import { Button } from "./Button"

const [focusingSomeRow, setFocusingSomeRow] = createSignal(false)

export function ItemRow(props: { item: ShoppingListItem }) {
	const [hoveringThisRow, setHoveringThisRow] = createSignal(false)
	const [focusingThisRow, setFocusingThisRow] = createSignal(false)

	const [newName, setNewName] = createSignal(props.item.name)

	const nameHasChanged = () => newName() !== props.item.name

	function submitNameChange() {
		if (nameHasChanged()) renameItem(props.item.id, newName())
	}

	let nameInputField: HTMLInputElement | undefined

	const dragDropContext = useDragDropContext()
	const sortable = dragDropContext ? createSortable(props.item.id, props.item) : undefined

	const showingActions = () => {
		if (props.item.checked) return false
		if (focusingSomeRow() && !focusingThisRow()) return false

		return focusingThisRow() || hoveringThisRow()
	}

	const onFocusIn = () => {
		batch(() => {
			setFocusingSomeRow(true)
			setFocusingThisRow(true)
		})
	}

	const onFocusOut = () => {
		setFocusingSomeRow(false)
		// Drop focus on a delay to fix issue with press on delete button
		// not being registered on mobile Safari.
		setTimeout(() => setFocusingThisRow(false), 100)
	}

	return (
		<li
			ref={(ref) => sortable?.ref(ref)}
			class="flex"
			style={sortable && transformStyle(sortable.transform)}
			classList={{
				"transition-transform": dragDropContext ? !!dragDropContext[0].active.draggable : false,
				"opacity-25": sortable?.isActiveDraggable,
			}}
		>
			<div
				class="flex flex-1 items-center justify-between overflow-hidden shrink-0"
				onPointerEnter={() => setHoveringThisRow(true)}
				onPointerLeave={() => setHoveringThisRow(false)}
				onFocusIn={onFocusIn}
				onFocusOut={(event) => {
					submitNameChange()

					if (!(event.relatedTarget && event.currentTarget.contains(event.relatedTarget as any))) {
						onFocusOut()
					}
				}}
			>
				<div class="flex flex-1">
					<label class="p-3 h-10 aspect-square flex items-center justify-center">
						<input
							class="w-5 h-5"
							type="checkbox"
							checked={props.item.checked}
							onChange={(event) => {
								setItemChecked(props.item.id, event.currentTarget.checked)
							}}
						/>
					</label>

					<form
						class="flex flex-1"
						onSubmit={(event) => {
							event.preventDefault()
							// Blur will trigger lost focus, and therefore submit the name change
							;(event.currentTarget[0] as HTMLInputElement)?.blur()
						}}
					>
						<input
							ref={nameInputField}
							value={props.item.name}
							style={{ "-webkit-tap-highlight-color": "transparent" }}
							spellcheck={false}
							class="flex-1 bg-transparent overflow-ellipsis focus:outline-none focus:underline"
							classList={{
								"line-through": props.item.checked,
							}}
							onInput={(event) => setNewName(event.currentTarget.value)}
						/>
					</form>
				</div>

				<Show when={showingActions()}>
					<div class="flex items-center">
						<Button onClick={() => deleteItem(props.item.id)}>
							<IconTrash height="100%" />
						</Button>
					</div>
				</Show>
			</div>

			<Show when={!props.item.checked}>
				<div
					class="flex items-center px-4 cursor-move touch-none transition-opacity duration-300"
					{...sortable?.dragActivators}
					classList={{ "opacity-20": focusingSomeRow() }}
				>
					<IconPadding class="opacity-40" />
				</div>
			</Show>
		</li>
	)
}
