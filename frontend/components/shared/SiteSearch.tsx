"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"

export interface SiteSearchEntry {
	readonly label: string
	readonly description?: string
	readonly href: string
	readonly keywords?: string
}

interface SiteSearchProps {
	readonly entries: readonly SiteSearchEntry[]
	readonly label: string
	readonly className?: string
}

export function SiteSearch({ entries, label, className = "" }: SiteSearchProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const searchRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const results = useMemo(() => {
		const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
		return entries.filter((entry) => {
			const searchableText = (entry.label + " " + (entry.description ?? "") + " " + (entry.keywords ?? "")).toLocaleLowerCase()
			return terms.every((term) => searchableText.includes(term))
		}).slice(0, terms.length ? 8 : 6)
	}, [entries, query])

	useEffect(() => {
		if (!open) return
		inputRef.current?.focus()
		const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
		const onPointerDown = (event: PointerEvent) => {
			if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setOpen(false)
		}
		document.addEventListener("keydown", onKeyDown)
		document.addEventListener("pointerdown", onPointerDown)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			document.removeEventListener("pointerdown", onPointerDown)
		}
	}, [open])

	return <div className={"site-search " + className} ref={searchRef}>
		<button className="site-search__trigger" type="button" aria-label={"Search " + label} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}><Search size={20} strokeWidth={1.8} aria-hidden="true" /></button>
		{open && <div className="site-search__panel" role="dialog" aria-label={"Search " + label}>
			<div className="site-search__input-wrap"><Search size={20} strokeWidth={1.8} aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={"Search " + label.toLocaleLowerCase()} aria-label={"Search " + label} /><button type="button" onClick={() => setOpen(false)} aria-label="Close search"><X size={20} strokeWidth={1.8} aria-hidden="true" /></button></div>
			<div className="site-search__results" aria-live="polite">{results.length ? results.map((entry) => <a className="site-search__result" href={entry.href} key={entry.href + ":" + entry.label} onClick={() => setOpen(false)}><strong>{entry.label}</strong>{entry.description && <span>{entry.description}</span>}</a>) : <p className="site-search__empty">No matches found. Try another search.</p>}</div>
		</div>}
	</div>
}
