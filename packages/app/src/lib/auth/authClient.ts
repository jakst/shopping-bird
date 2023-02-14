import { createSolidAuthClient } from "@solid-auth/core"

const baseUrl = typeof window === "undefined" ? import.meta.env.BASE_URL : "/"
export const authClient = createSolidAuthClient(`${baseUrl}api/auth`)
