"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"

export interface SiteSearchEntry {
	readonly label: string
	readonly description?: string
	readonly href: string
	readonly keywords?: string
}

function normalizeSearchText(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()
}

function rankSearchEntry(entry: SiteSearchEntry, query: string, terms: readonly string[]): number {
	const label = normalizeSearchText(entry.label)
	const description = normalizeSearchText(entry.description ?? "")
	const keywords = normalizeSearchText(entry.keywords ?? "")
	const allText = `${label} ${description} ${keywords}`
	if (!terms.every((term) => allText.includes(term))) return -1

	let score = 0
	if (label === query) score += 10_000
	else if (label.startsWith(query)) score += 8_000
	else if (label.split(" ").some((word) => word.startsWith(query))) score += 7_000
	else if (label.includes(query)) score += 6_000

	for (const term of terms) {
		if (label === term) score += 1_500
		else if (label.split(" ").some((word) => word === term)) score += 1_200
		else if (label.split(" ").some((word) => word.startsWith(term))) score += 900
		else if (label.includes(term)) score += 600
		else if (description.includes(term)) score += 250
		else if (keywords.includes(term)) score += 100
	}
	return score
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
		const normalizedQuery = normalizeSearchText(query)
		const terms = normalizedQuery.split(/\s+/).filter(Boolean)
		if (!terms.length) return entries.slice(0, 6)
		return entries
			.map((entry, index) => ({ entry, index, score: rankSearchEntry(entry, normalizedQuery, terms) }))
			.filter((result) => result.score >= 0)
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.slice(0, 8)
			.map(({ entry }) => entry)
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
