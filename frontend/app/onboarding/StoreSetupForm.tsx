"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { createStore } from "./actions"

export function StoreSetupForm() {
	const router = useRouter()
	const [message, setMessage] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage("")
		setIsSubmitting(true)
		const result = await createStore(new FormData(event.currentTarget))
		setIsSubmitting(false)
		if (!result.ok) {
			setMessage(result.message)
			return
		}
		router.push(`/${result.slug}`)
	}

	return (
		<form className="auth-form onboarding-form" onSubmit={handleSubmit}>
			<label>
				Salon or business name
				<input name="businessName" type="text" required maxLength={120} />
			</label>
			<label>
				Homepage headline
				<input
					name="heroTitle"
					type="text"
					maxLength={140}
					placeholder="Feel confident in your signature look"
				/>
			</label>
			<label>
				Homepage supporting line
				<input
					name="heroSubtitle"
					type="text"
					maxLength={160}
					placeholder="Hair, beauty, and self-care made personal"
				/>
			</label>
			<label>
				Store address
				<input
					name="slug"
					type="text"
					required
					minLength={3}
					maxLength={48}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					placeholder="your-salon"
				/>
			</label>
			<label>
				Starting plan
				<select name="planTier" defaultValue="starter">
					<option value="starter">Starter</option>
					<option value="business">Business</option>
					<option value="enterprise">Enterprise</option>
				</select>
			</label>
			<div className="onboarding-form__row">
				<label>
					City
					<input name="city" type="text" maxLength={80} placeholder="Nairobi" />
				</label>
				<label>
					Country
					<input
						name="country"
						type="text"
						defaultValue="Kenya"
						required
						maxLength={80}
					/>
				</label>
			</div>
			<input name="timezone" type="hidden" value="Africa/Nairobi" readOnly />
			<input name="locale" type="hidden" value="en-KE" readOnly />
			<input name="currency" type="hidden" value="KES" readOnly />
			<fieldset className="legal-consent">
				<legend>Platform agreement</legend>
				<label>
					<input name="termsAccepted" type="checkbox" required /> I agree to the{" "}
					<Link href="/terms" target="_blank">
						Terms of Service
					</Link>
					.
				</label>
				<label>
					<input name="privacyAccepted" type="checkbox" required /> I
					acknowledge the{" "}
					<Link href="/privacy" target="_blank">
						Privacy Policy
					</Link>
					.
				</label>
				<label>
					<input name="cookiesAccepted" type="checkbox" required /> I
					acknowledge the{" "}
					<Link href="/cookies" target="_blank">
						Cookie Policy
					</Link>
					.
				</label>
			</fieldset>
			<button
				className="button button--primary"
				type="submit"
				disabled={isSubmitting}
			>
				{isSubmitting ? "Creating store…" : "Create my store"}
			</button>
			{message && (
				<p className="form-message" role="alert">
					{message}
				</p>
			)}
			<p className="auth-form__switch">
				<Link href="/manage">Return to workspace</Link>
			</p>
		</form>
	)
}
