import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { Resource } from "@effect/opentelemetry/Resource"
import { WorkersSDK } from "opentelemetry-sdk-workers"

export type Configuration = Partial<Omit<NodeSDKConfiguration, "resource" | "serviceName">>

export const config: (config: Configuration) => Configuration = (config: Configuration) => config

export const layer = <R, E>(config: Effect.Effect<R, E, Configuration>): Layer.Layer<Resource | R, E, never> =>
	Layer.scopedDiscard(
		Effect.acquireRelease(
			Effect.flatMap(Effect.all([config, Resource]), ([config, resource]) =>
				Effect.sync(() => {
					// const sdk = new WorkersSDK({ ...config, resource })
					const sdk = new WorkersSDK({ ...config, resource })
					sdk.start()
					return sdk
				}),
			),
			(sdk) => Effect.promise(() => sdk.shutdown()),
		),
	)
