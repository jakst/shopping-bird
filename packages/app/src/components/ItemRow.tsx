import { createSortable, useDragDropContext } from "@thisbeyond/solid-dnd"
import { type ShoppingListItem } from "lib"
import { createSignal, Show } from "solid-js"
import IconCheck from "~icons/ci/check"
import IconTrash from "~icons/ci/trash-full"
import { Button } from "./Button"

interface Actions {
	deleteItem: (id: string) => void
	setChecked: (id: string, checked: boolean) => void
	renameItem: (id: string, name: string) => void
}

export function ItemRow(props: { item: ShoppingListItem; actions: Actions }) {
	const [hovering, setHovering] = createSignal(false)
	const [focusing, setFocusing] = createSignal(false)

	const [newName, setNewName] = createSignal(props.item.name)

	const nameHasChanged = () => newName() !== props.item.name

	function submitNameChange() {
		props.actions.renameItem(props.item.id, newName())
		setFocusing(false)
	}

	let nameInputField: HTMLInputElement | undefined

	const dragDropContext = useDragDropContext()
	const sortable = dragDropContext ? createSortable(props.item.id, props.item) : undefined

	const showingActions = () => (hovering() || focusing()) && !sortable?.isActiveDraggable

	return (
		<li
			ref={(ref) => sortable?.(ref)}
			class="flex px-1 items-center justify-between overflow-hidden shrink-0 cursor-move touch-none"
			classList={{ "transition-transform": dragDropContext ? !!dragDropContext[0].active.draggable : false }}
			style={sortable?.isActiveDraggable ? { opacity: 0.25 } : undefined}
			onPointerEnter={() => setHovering(true)}
			onPointerLeave={() => setHovering(false)}
			onFocusIn={() => setFocusing(true)}
			onFocusOut={(event) => {
				if (!(event.relatedTarget && event.currentTarget.contains(event.relatedTarget as any))) {
					setFocusing(false)

					// Reset unsubmitted name changes when we stop focusing the row
					setNewName(props.item.name)
					if (nameInputField) nameInputField.value = props.item.name
				}
			}}
		>
			<div class="flex flex-1">
				<label class="p-3 h-10 aspect-square flex items-center justify-center">
					<input
						class="w-5 h-5 text-blue-600 bg-gray-100 rounded border-gray-300 "
						type="checkbox"
						checked={props.item.checked}
						onChange={(event) => {
							// If the user types a new name, and then checks/unchecks
							// the item, the name change should also be submitted.
							if (nameHasChanged()) submitNameChange()

							props.actions.setChecked(props.item.id, event.currentTarget.checked)
						}}
					/>
				</label>

				<form
					class="flex flex-1"
					onSubmit={(event) => {
						event.preventDefault()
						if (nameHasChanged()) submitNameChange()
						;(event.currentTarget[0] as HTMLInputElement)?.blur()
					}}
				>
					<input
						ref={nameInputField}
						value={props.item.name}
						class={`flex-1 bg-transparent overflow-ellipsis focus:outline-none focus:underline border-slate-800${
							props.item.checked ? " line-through text-gray-500" : " text-gray-900"
						}`}
						onInput={(event) => setNewName(event.currentTarget.value)}
					/>
				</form>
			</div>

			<Show when={showingActions()}>
				<div class="ml-1 mr-2 flex items-center">
					<Button disabled={!nameHasChanged()} onClick={submitNameChange}>
						<IconCheck height="100%" />
					</Button>

					<Button onClick={() => props.actions.deleteItem(props.item.id)}>
						<IconTrash height="100%" />
					</Button>
				</div>
			</Show>
		</li>
	)
}
