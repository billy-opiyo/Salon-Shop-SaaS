export function formatKesLabel(value: string | null | undefined): string {
	return (value ?? "").replace(/\bKSh\b/gi, "KES")
}
