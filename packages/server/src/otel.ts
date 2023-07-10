import * as Layer from "@effect/io/Layer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { OTLPTraceExporter as OTLPTraceExporterHttp } from "@opentelemetry/exporter-trace-otlp-http"
import { env } from "./env"

export const traceExporter =
	env.USE_LOCAL_EXPORTER === "1"
		? new OTLPTraceExporterHttp({ url: "http://127.0.0.1:4318/v1/traces" })
		: new OTLPTraceExporterHttp({
				url: "https://otel.baselime.io/v1",
				headers: { "x-api-key": env.BASELIME_API_KEY },
		  })

const NodeSdkLive = NodeSdk.layer({
	traceExporter,
})

const ResourceLive = Resource.layer({ serviceName: "backend" })
export const TracingLive = Layer.provide(ResourceLive, Layer.merge(NodeSdkLive, Tracer.layer))
