import { expect, test } from "bun:test"
import { Queue } from "effect"

const derp = Queue.unbounded<string>()

test("2 + 2", () => {
	expect(2 + 2).toBe(4)
})
