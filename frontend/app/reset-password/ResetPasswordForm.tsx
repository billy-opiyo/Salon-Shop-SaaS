"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ResetMode = "request" | "requested" | "reset" | "done";

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [mode, setMode] = useState<ResetMode>(initialToken ? "reset" : "request");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; error?: string }
      | null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("");
    setIsSubmitting(true);
    try {
      if (mode === "request") {
        const data = await post({
          action: "request",
          email: formData.get("email"),
        });
        setIsSubmitting(false);
        if (!data || data.error) {
          setMessage(data?.error ?? "The reset request failed. Please try again.");
          return;
        }
        setMode("requested");
        setMessage(data.message ?? "Check your inbox for the reset link.");
        return;
      }

      if (mode === "reset") {
        const data = await post({
          action: "reset",
          token: initialToken.trim(),
          newPassword: formData.get("newPassword"),
        });
        setIsSubmitting(false);
        if (!data || data.error) {
          setMessage(data?.error ?? "Password reset failed. Request a fresh link.");
          return;
        }
        setMode("done");
        return;
      }
    } catch {
      setIsSubmitting(false);
      setMessage("Something went wrong. Please check your connection and try again.");
    }
  }

  if (mode === "done") {
    return (
      <>
        <p className="auth-card__intro">
          Your password has been updated. All previous sessions were signed out.
        </p>
        <p className="auth-form__switch">
          <Link href="/login">Continue to sign in</Link>
        </p>
      </>
    );
  }

  if (mode === "requested") {
    return (
      <>
        <p className="auth-card__intro">{message}</p>
        <p className="form-message">
          Tip: the link expires in 30 minutes and can be used once.
        </p>
        <p className="auth-form__switch">
          <a href="/reset-password">Send another link</a> ·{" "}
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === "request" ? (
        <>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </>
      ) : (
        <>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </>
      )}
      {message && mode === "request" && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
      <p className="auth-form__switch">
        <Link href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}