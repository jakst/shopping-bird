export async function pause(ms: number) {
	await new Promise((resolve) => setTimeout(resolve, ms))
}
