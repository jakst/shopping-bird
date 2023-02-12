// @refresh reload
import { Suspense } from "solid-js"
import { Body, ErrorBoundary, FileRoutes, Head, Html, Link, Meta, Routes, Scripts, Title } from "solid-start"
import "./root.css"

export default function Root() {
	return (
		<Html lang="en">
			<Head>
				<Title>Shopping Bird</Title>
				<Meta charset="utf-8" />
				<Meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta name="description" content="Your shopping list" />

				{/* temp */}
				<Link rel="apple-touch-icon" href="/icon-192x192.png" sizes="180x180" />
				<Link rel="mask-icon" href="/icon-192x192.png" color="#ffffff" />
				<Meta name="theme-color" content="#0369a1" />
				{/* /temp */}

				<Link rel="manifest" type="application/manifest+json" href="/manifest.webmanifest" />
				<Link rel="icon" type="image/png" href="/favicon.png" />

				<Link rel="preload" href="Hubot-Sans-1.0.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
				<script src="/registerSW.js" />
			</Head>

			<Body>
				<Suspense>
					<ErrorBoundary>
						<Routes>
							<FileRoutes />
						</Routes>
					</ErrorBoundary>
				</Suspense>
				<Scripts />
			</Body>
		</Html>
	)
}
