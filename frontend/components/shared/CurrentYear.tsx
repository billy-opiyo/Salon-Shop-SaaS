"use client"

import { useEffect, useState } from "react"

export function CurrentYear() {
	const [year, setYear] = useState(() => new Date().getFullYear())

	useEffect(() => {
		const refreshYear = () => setYear(new Date().getFullYear())
		const intervalId = window.setInterval(refreshYear, 60_000)

		return () => window.clearInterval(intervalId)
	}, [])

	return (
		<time dateTime={String(year)} suppressHydrationWarning>
			{year}
		</time>
	)
}
