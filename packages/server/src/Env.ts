import type { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object"

export type Env = {
	TinyDO: DurableObjectNamespace<WsServerDurableObject>
	KEEP_EMAIL: string
	KEEP_SHOPPING_LIST_ID: string
	KEEP_MASTER_KEY: string
}
