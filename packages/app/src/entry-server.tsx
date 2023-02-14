import { createHandler, renderAsync, StartServer } from "solid-start/entry-server"
import { createAuthMiddleware } from "./lib/auth/middleware"

export default createHandler(
	createAuthMiddleware(["/"]),
	renderAsync((event) => <StartServer event={event} />),
)

//
