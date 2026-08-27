"use client"

import { useState } from "react"

type Domain = {
	readonly id: string
	readonly host: string
	readonly status: string
	readonly isPrimary: boolean
	readonly verifiedAt: string | null
	readonly verificationAttempts: number
	readonly verificationTokenExpiresAt: string | null
}

type Registration = Domain & {
	readonly verification: {
		readonly name: string
		readonly type: string
		readonly value: string
	}
}

export function DomainManager({
	tenantSlug,
	initialDomains,
}: {
	tenantSlug: string
	initialDomains: Domain[]
}) {
	const [domains, setDomains] = useState(initialDomains)
	const [host, setHost] = useState("")
	const [record, setRecord] = useState<Registration["verification"] | null>(
		null,
	)
	const [message, setMessage] = useState("")
	const [busy, setBusy] = useState(false)

	async function request(
		method: "POST" | "DELETE",
		body?: Record<string, string>,
		domainId?: string,
	) {
		setBusy(true)
		setMessage("")
		try {
			const response = await fetch(
				`/api/manage/${encodeURIComponent(tenantSlug)}/domains${domainId ? `?domainId=${encodeURIComponent(domainId)}` : ""}`,
				{
					method,
					headers: { "content-type": "application/json" },
					body: body ? JSON.stringify(body) : undefined,
				},
			)
			const data = (await response.json().catch(() => null)) as
				| Domain
				| Registration
				| { error?: string }
				| null
			if (!response.ok)
				throw new Error(
					data && "error" in data ? data.error : "Domain operation failed.",
				)
			if (method === "DELETE") {
				setDomains((current) => current.filter((item) => item.id !== domainId))
			} else if (body?.action === "register") {
				const registration = data as Registration
				setDomains((current) => [
					...current.filter((item) => item.id !== registration.id),
					registration,
				])
				setRecord(registration.verification)
				setHost("")
			} else {
				const updated = data as Domain
				setDomains((current) =>
					current.map((item) =>
						item.id === updated.id
							? { ...item, ...updated }
							: updated.status === "ACTIVE"
								? { ...item, isPrimary: false, status: "VERIFIED" }
								: item,
					),
				)
			}
			setMessage(
				method === "DELETE"
					? "Domain removed."
					: body?.action === "register"
						? "Add the DNS record, then verify the domain."
						: "Domain updated.",
			)
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Domain operation failed.",
			)
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			{message && (
				<p className="form-message" role="status">
					{message}
				</p>
			)}
			<section className="manage-store-list" aria-label="Custom domains">
				{domains.length === 0 ? (
					<p className="manage-empty">No custom domains are connected.</p>
				) : (
					domains.map((domain) => (
						<article className="manage-store" key={domain.id}>
							<div>
								<p className="eyebrow">
									{domain.status.toLowerCase().replaceAll("_", " ")}{" "}
									{domain.isPrimary ? "· primary" : ""}
								</p>
								<h2>{domain.host}</h2>
								<p>{domain.verificationAttempts}/5 verification checks used</p>
							</div>
							<div className="manage-store__actions">
								{domain.status === "PENDING_VERIFICATION" && (
									<button
										className="button button--outline button--small"
										type="button"
										disabled={busy}
										onClick={() =>
											void request("POST", {
												action: "verify",
												domainId: domain.id,
											})
										}
									>
										Verify DNS
									</button>
								)}
								{domain.status === "VERIFIED" && (
									<button
										className="button button--primary button--small"
										type="button"
										disabled={busy}
										onClick={() =>
											void request("POST", {
												action: "activate",
												domainId: domain.id,
											})
										}
									>
										Make primary
									</button>
								)}
								{domain.status !== "REMOVED" && (
									<button
										className="button button--outline button--small"
										type="button"
										disabled={busy}
										onClick={() => void request("DELETE", undefined, domain.id)}
									>
										Remove
									</button>
								)}
							</div>
						</article>
					))
				)}
			</section>
			{record && (
				<section className="manage-card" aria-labelledby="dns-record-title">
					<p className="eyebrow">DNS verification</p>
					<h2 id="dns-record-title">Publish this TXT record</h2>
					<p>
						Add it at your DNS provider, wait for propagation, then select
						Verify DNS.
					</p>
					<dl>
						<div>
							<dt>Name</dt>
							<dd>{record.name}</dd>
						</div>
						<div>
							<dt>Type</dt>
							<dd>{record.type}</dd>
						</div>
						<div>
							<dt>Value</dt>
							<dd>{record.value}</dd>
						</div>
					</dl>
				</section>
			)}
			<form
				className="onboarding-form"
				aria-label="Register custom domain"
				onSubmit={(event) => {
					event.preventDefault()
					void request("POST", { action: "register", host })
				}}
			>
				<h2>Connect a domain</h2>
				<label>
					Hostname
					<input
						value={host}
						onChange={(event) => setHost(event.target.value)}
						placeholder="www.yoursalon.com"
						required
					/>
				</label>
				<button
					className="button button--primary"
					type="submit"
					disabled={busy}
				>
					Register domain
				</button>
			</form>
		</>
	)
}
