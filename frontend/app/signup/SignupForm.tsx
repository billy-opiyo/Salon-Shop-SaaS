"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { registerAccount } from "./actions";

export function SignupForm() {
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const result = await registerAccount(new FormData(event.currentTarget));
    setIsSubmitting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Account created. Email verification will be enabled when Resend is configured.");
    event.currentTarget.reset();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Full name<input name="name" type="text" autoComplete="name" required /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <input name="turnstileToken" type="hidden" value="development-placeholder" readOnly />
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</button>
      {message && <p className="form-message" role="status">{message}</p>}
      <p className="auth-form__switch">Already registered? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
