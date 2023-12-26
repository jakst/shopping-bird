import { StartServer, createHandler, renderAsync } from "solid-start/entry-server"
import { createAuthMiddleware } from "./lib/auth/middleware"

export default createHandler(
	createAuthMiddleware(["/"]),
	renderAsync((event) => <StartServer event={event} />),
)
