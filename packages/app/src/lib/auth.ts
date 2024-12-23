import { action, query, redirect } from "@solidjs/router"
import { getCookie, getRequestProtocol, setCookie } from "vinxi/http"
import { secretEnv } from "./secretEnv"

export const checkAuth = query(async () => {
	"use server"

	const nextPath = getCookie("authenticated") === "true" ? "/" : "/login"
	return redirect(nextPath)
}, "auth")

export const login = action(async (formData: FormData) => {
	"use server"

	const username = String(formData.get("username")).toLowerCase().trim()
	const password = String(formData.get("password")).toLowerCase().trim()

	if (`${username}:${password}` !== secretEnv.AUTH_INFO) return new Error("Invalid credentials")

	setCookie("authenticated", "true", {
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
		httpOnly: true,
		sameSite: "lax",
		secure: getRequestProtocol() === "https",
	})

	return redirect("/")
})
