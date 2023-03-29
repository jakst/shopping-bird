export function isInputField(element: Element | null | undefined): element is HTMLInputElement {
	return !!element && element.tagName === "INPUT"
}
