"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

import { GoogleIcon } from "@/components/shared/GoogleIcon";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setIsSubmitting(false);
    if (result?.error) {
      setMessage("Sign-in failed. Check your details and verify your email.");
      return;
    }
    router.push("/manage");
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setIsSubmitting(true);
    try {
      await signIn("google", { callbackUrl: "/manage" });
    } catch {
      setIsSubmitting(false);
      setMessage("Google sign-in is temporarily unavailable. Please try again.");
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <button className="auth-google-button" type="button" onClick={handleGoogleSignIn} disabled={isSubmitting}>
        <GoogleIcon />
        Continue with Google
      </button>
      <div className="auth-divider" aria-hidden="true"><span>or</span></div>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
      {message && <p className="form-message" role="alert">{message}</p>}
      <p className="auth-form__switch">New here? <Link href="/signup">Create an account</Link></p>
    </form>
  );
}
