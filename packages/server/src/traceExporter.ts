import { OTLPTraceExporter as OTLPTraceExporterHttp } from "@opentelemetry/exporter-trace-otlp-http"
import { env } from "./env"

export const traceExporter =
	env.USE_LOCAL_EXPORTER === "1"
		? new OTLPTraceExporterHttp({ url: "http://127.0.0.1:4318/v1/traces" })
		: new OTLPTraceExporterHttp({
				url: "https://otel.baselime.io/v1",
				headers: { "x-api-key": env.BASELIME_API_KEY },
		  })
