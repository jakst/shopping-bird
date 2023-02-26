import { JSX } from "solid-js"

export function Button(props: { onClick?: () => void; disabled?: boolean; children: JSX.Element }) {
	return (
		<button
			class="aspect-square h-7 flex items-center justify-center rounded-full enabled:hover:bg-color4 disabled:opacity-0"
			onClick={props.onClick}
			disabled={props.disabled}
		>
			{props.children}
		</button>
	)
}
