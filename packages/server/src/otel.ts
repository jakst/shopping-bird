import * as Layer from "@effect/io/Layer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as Tracer from "@effect/opentelemetry/Tracer"
import { traceExporter } from "./traceExporter"

const NodeSdkLive = NodeSdk.layer({
	traceExporter,
})

const ResourceLive = Resource.layer({ serviceName: "backend" })
export const TracingLive = Layer.provide(ResourceLive, Layer.merge(NodeSdkLive, Tracer.layer))
