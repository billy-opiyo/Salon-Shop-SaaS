"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
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
	const [activeIndex, setActiveIndex] = useState(-1)
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
	const activeResultIndex = activeIndex < results.length ? activeIndex : -1

	function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown" && results.length) {
			event.preventDefault()
			setActiveIndex((current) => (current + 1) % results.length)
		} else if (event.key === "ArrowUp" && results.length) {
			event.preventDefault()
			setActiveIndex((current) => current < 0 ? results.length - 1 : (current - 1 + results.length) % results.length)
		} else if (event.key === "Enter" && activeResultIndex >= 0) {
			event.preventDefault()
			window.location.assign(results[activeResultIndex].href)
		} else if (event.key === "Escape") {
			setOpen(false)
		}
	}

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
		<button className="site-search__trigger" type="button" aria-label={"Search " + label} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setActiveIndex(-1); setOpen((value) => !value) }}><Search size={20} strokeWidth={1.8} aria-hidden="true" /></button>
		{open && <div className="site-search__panel" role="dialog" aria-label={"Search " + label}>
			<div className="site-search__input-wrap"><Search size={20} strokeWidth={1.8} aria-hidden="true" /><input ref={inputRef} role="combobox" aria-autocomplete="list" aria-expanded={open} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1) }} onKeyDown={handleInputKeyDown} placeholder={"Search " + label.toLocaleLowerCase()} aria-label={"Search " + label} aria-activedescendant={activeResultIndex >= 0 ? `site-search-option-${activeResultIndex}` : undefined} aria-controls="site-search-results" autoComplete="off" /><button type="button" onClick={() => { setActiveIndex(-1); setOpen(false) }} aria-label="Close search"><X size={20} strokeWidth={1.8} aria-hidden="true" /></button></div>
			<div id="site-search-results" className="site-search__results" role="listbox" aria-label="Search recommendations" aria-live="polite">{results.length ? results.map((entry, index) => <a id={`site-search-option-${index}`} role="option" aria-selected={activeResultIndex === index} className="site-search__result" href={entry.href} key={entry.href + ":" + entry.label} onMouseEnter={() => setActiveIndex(index)} onClick={() => { setActiveIndex(-1); setOpen(false) }}><strong>{entry.label}</strong>{entry.description && <span>{entry.description}</span>}</a>) : <p className="site-search__empty">No matches found. Try another search.</p>}</div>
		</div>}
	</div>
}
