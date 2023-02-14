import { createSolidAuthHandler } from "@solid-auth/core"
import { authenticator } from "~/lib/auth/authenticator"

const handler = createSolidAuthHandler<{ id: string }>(authenticator)

export const POST = handler
export const GET = handler
