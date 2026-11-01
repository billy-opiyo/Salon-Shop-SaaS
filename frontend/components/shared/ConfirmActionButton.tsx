"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"

type ConfirmationDialogProps = {
	open: boolean
	title: string
	message: string
	confirmLabel: string
	busy?: boolean
	onCancel: () => void
	onConfirm: () => void | Promise<void>
}

function ConfirmationDialog({
	open,
	title,
	message,
	confirmLabel,
	busy = false,
	onCancel,
	onConfirm,
}: ConfirmationDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const titleId = useId()
	const messageId = useId()

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return
		if (open && !dialog.open) dialog.showModal()
		if (!open && dialog.open) dialog.close()
	}, [open])

	return (
		<dialog
			ref={dialogRef}
			className="action-confirmation-dialog"
			aria-labelledby={titleId}
			aria-describedby={messageId}
			onCancel={(event) => {
				event.preventDefault()
				if (!busy) onCancel()
			}}
			onClick={(event) => {
				if (event.target === dialogRef.current && !busy) onCancel()
			}}
		>
			<div className="action-confirmation-dialog__content" role="alertdialog" aria-modal="true">
				<p className="eyebrow">Please confirm</p>
				<h2 id={titleId}>{title}</h2>
				<p id={messageId}>{message}</p>
				<div className="action-confirmation-dialog__actions">
					<button className="button button--outline button--small" type="button" onClick={onCancel} disabled={busy}>
						Keep it
					</button>
					<button className="button button--danger button--small" type="button" onClick={onConfirm} disabled={busy}>
						{busy ? "Working…" : confirmLabel}
					</button>
				</div>
			</div>
		</dialog>
	)
}

export function ConfirmActionButton({
	label,
	message,
	title = "Confirm this action",
	confirmLabel = label,
	className = "button button--outline button--small",
	disabled = false,
	onConfirm,
}: {
	readonly label: string
	readonly message: string
	readonly title?: string
	readonly confirmLabel?: string
	readonly className?: string
	readonly disabled?: boolean
	readonly onConfirm: () => void | Promise<void>
}) {
	const [open, setOpen] = useState(false)
	const [busy, setBusy] = useState(false)

	const confirm = async () => {
		setBusy(true)
		try {
			await onConfirm()
			setOpen(false)
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<button className={className} type="button" disabled={disabled || busy} onClick={() => setOpen(true)}>
				{label}
			</button>
			<ConfirmationDialog
				open={open}
				title={title}
				message={message}
				confirmLabel={confirmLabel}
				busy={busy}
				onCancel={() => setOpen(false)}
				onConfirm={confirm}
			/>
		</>
	)
}

export function ConfirmSubmitButton({
	children,
	message,
	title = "Confirm this action",
	confirmLabel = "Confirm",
	className = "button button--outline button--small",
	pendingLabel = "Working…",
}: {
	readonly children: ReactNode
	readonly message: string
	readonly title?: string
	readonly confirmLabel?: string
	readonly className?: string
	readonly pendingLabel?: string
}) {
	const [open, setOpen] = useState(false)
	const submitButtonRef = useRef<HTMLButtonElement>(null)
	const { pending } = useFormStatus()

	const confirm = () => {
		setOpen(false)
		submitButtonRef.current?.form?.requestSubmit()
	}

	return (
		<>
			<button
				ref={submitButtonRef}
				className={className}
				type="button"
				disabled={pending}
				onClick={() => setOpen(true)}
			>
				{pending ? pendingLabel : children}
			</button>
			<ConfirmationDialog
				open={open}
				title={title}
				message={message}
				confirmLabel={confirmLabel}
				busy={pending}
				onCancel={() => setOpen(false)}
				onConfirm={confirm}
			/>
		</>
	)
}
