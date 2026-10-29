"use client"

import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"

export const PENDING_MOBILE_GOOGLE_AUTH_KEY = "beauty-sphia.mobile-google-auth.pending"

function encodeBase64Url(bytes: Uint8Array): string {
	let binary = ""
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function createCodeChallenge(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
	return encodeBase64Url(new Uint8Array(digest))
}

export function getSafeLocalCallbackUrl(value: string): string | null {
	if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null
	try {
		const target = new URL(value, window.location.origin)
		return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : null
	} catch {
		return null
	}
}

export async function openNativeGoogleSignIn(callbackUrl: string): Promise<boolean> {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return false
	const safeCallbackUrl = getSafeLocalCallbackUrl(callbackUrl)
	if (!safeCallbackUrl) throw new Error("Invalid sign-in return page")
	const { id: applicationId } = await App.getInfo()
	if (applicationId !== "com.beautysphia.app.staging" && applicationId !== "com.beautysphia.app") {
		throw new Error("This Beauty Sphia app identity is not allowed to start Google sign-in")
	}
	const state = crypto.randomUUID()
	const verifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
	const challenge = await createCodeChallenge(verifier)
	window.localStorage.setItem(PENDING_MOBILE_GOOGLE_AUTH_KEY, JSON.stringify({ state, verifier, callbackUrl: safeCallbackUrl, applicationId }))
	const startUrl = new URL("/auth/mobile-google-start", window.location.origin)
	startUrl.searchParams.set("state", state)
	startUrl.searchParams.set("challenge", challenge)
	startUrl.searchParams.set("applicationId", applicationId)
	await Browser.open({ url: startUrl.toString() })
	return true
}
