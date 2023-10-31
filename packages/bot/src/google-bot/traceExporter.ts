import { OTLPTraceExporter as OTLPTraceExporterHttp } from "@opentelemetry/exporter-trace-otlp-http"

const env = {
	USE_LOCAL_EXPORTER: undefined,
	BASELIME_API_KEY: "wkx8Myimco1ZQQrAmlj9S8iq4U0Hbd9B2eZDI6DQ",
}

export const traceExporter =
	env.USE_LOCAL_EXPORTER === "1"
		? new OTLPTraceExporterHttp({ url: "http://127.0.0.1:4318/v1/traces" })
		: new OTLPTraceExporterHttp({
				url: "https://otel.baselime.io/v1",
				headers: { "x-api-key": env.BASELIME_API_KEY },
		  })
