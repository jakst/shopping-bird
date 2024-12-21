import type { WsServerDurableObject } from "tinybase/synchronizers/synchronizer-ws-server-durable-object"

export type Env = {
	DO: DurableObjectNamespace
	TinyObject: DurableObjectNamespace<WsServerDurableObject>
	ENV_DISCRIMINATOR: string
	HYPERDX_API_KEY: string
	OTEL_SERVICE_NAME: string
	OTEL_EXPORTER_OTLP_ENDPOINT: string
	KEEP_EMAIL: string
	KEEP_SHOPPING_LIST_ID: string
	KEEP_MASTER_KEY: string
}
