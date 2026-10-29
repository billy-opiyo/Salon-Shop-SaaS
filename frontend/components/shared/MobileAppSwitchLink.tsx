"use client"

import { useEffect, useRef } from "react"

import { initializeMobileAppSwitchLink } from "@/lib/mobile-app-switch"

export function MobileAppSwitchLink({ className = "" }: { readonly className?: string }) {
	const anchorRef = useRef<HTMLAnchorElement>(null)

	useEffect(() => {
		const anchor = anchorRef.current
		if (!anchor) return
		return initializeMobileAppSwitchLink(anchor)
	}, [])

	return <a ref={anchorRef} className={className} href="#mobile-app">Download Mobile App</a>
}
