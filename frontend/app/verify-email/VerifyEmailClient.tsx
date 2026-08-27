"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type VerificationState = "idle" | "verifying" | "success" | "error";

export function VerifyEmailClient({ initialToken }: { initialToken: string }) {
  const [state, setState] = useState<VerificationState>(
    initialToken ? "verifying" : "idle",
  );
  const [message, setMessage] = useState<string>("");
  const [token, setToken] = useState<string>(initialToken);

  const submitToken = useCallback(async (value: string) => {
    setState("verifying");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        setState("error");
        setMessage(
          data?.error ?? "Email verification failed. The link may have expired.",
        );
        return;
      }
      setState("success");
    } catch {
      setState("error");
      setMessage(
        "Email verification failed. Please check your connection and try again.",
      );
    }
  }, []);

  useEffect(() => {
    if (initialToken) void submitToken(initialToken);
  }, [initialToken, submitToken]);

  if (state === "success") {
    return (
      <>
        <h1>Email verified 🎉</h1>
        <p className="auth-card__intro">
          Your email address is confirmed. You can now sign in and use every
          part of your account.
        </p>
        <p className="auth-form__switch">
          <Link href="/login">Continue to sign in</Link>
        </p>
      </>
    );
  }

  if (state === "verifying") {
    return <p role="status">Verifying your email…</p>;
  }

  if (state === "error") {
    return (
      <>
        <h1>We could not verify your email.</h1>
        {message && (
          <p className="form-message" role="alert">
            {message}
          </p>
        )}
        <button
          className="button button--primary"
          type="button"
          onClick={() => setState("idle")}
        >
          Try another link
        </button>
        <p className="auth-form__switch">
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Verify your email.</h1>
      <p className="auth-card__intro">
        Open the verification email we sent you and click its button, or paste
        the token below to activate your account.
      </p>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submitToken(token.trim());
        }}
      >
        <label>
          Verification token
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            minLength={32}
            spellCheck={false}
          />
        </label>
        <button className="button button--primary" type="submit">
          Verify email
        </button>
      </form>
      <p className="auth-form__switch">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}