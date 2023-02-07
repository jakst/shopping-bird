import { Motion, Presence } from "@motionone/solid"
import { type ShoppingListItem } from "shopping-bird-lib"
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
	const [isDisappearing, setIsDisappearing] = createSignal(false)
	const [hovering, setHovering] = createSignal(false)
	const [focusing, setFocusing] = createSignal(false)
	const showingActions = () => hovering() || focusing()

	const [newName, setNewName] = createSignal(props.item.name)

	const nameHasChanged = () => newName() !== props.item.name

	function submitNameChange() {
		props.actions.renameItem(props.item.id, newName())
		setFocusing(false)
	}

	let nameInputField: HTMLInputElement | undefined

	return (
		<Presence initial={false}>
			<Show when={!isDisappearing()}>
				<Motion.li
					exit={{ opacity: 0, transition: { duration: 0.4 } }}
					class="flex px-1 items-center justify-between"
					onMouseOver={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
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
					<div class="flex">
						<label class="p-3 h-10 aspect-square flex items-center justify-center">
							<input
								class="w-5 h-5 text-blue-600 bg-gray-100 rounded border-gray-300 "
								type="checkbox"
								checked={props.item.checked}
								onChange={(event) => {
									const { id } = props.item
									const { checked } = event.currentTarget

									// If the user types a new name, and then checks/unchecks
									// the item, the name change should also be submitted.
									if (nameHasChanged()) submitNameChange()

									setIsDisappearing(true)
									setTimeout(() => props.actions.setChecked(id, checked), 500)
								}}
							/>
						</label>

						<form
							class="flex"
							onSubmit={(event) => {
								event.preventDefault()
								if (nameHasChanged()) submitNameChange()
								;(event.currentTarget[0] as HTMLInputElement)?.blur()
							}}
						>
							<input
								ref={nameInputField}
								value={props.item.name}
								class={`focus:outline-none focus:underline border-slate-800${
									props.item.checked ? " line-through text-gray-500" : " text-gray-900"
								}`}
								onInput={(event) => setNewName(event.currentTarget.value)}
							/>
						</form>
					</div>

					<Show when={showingActions()}>
						<div class="ml-6 mr-2 flex items-center">
							<Button disabled={!nameHasChanged()} onClick={submitNameChange}>
								<IconCheck height="100%" />
							</Button>

							<Button
								onClick={() => {
									const { id } = props.item

									setIsDisappearing(true)
									setTimeout(() => props.actions.deleteItem(id), 500)
								}}
							>
								<IconTrash height="100%" />
							</Button>
						</div>
					</Show>
				</Motion.li>
			</Show>
		</Presence>
	)
}
