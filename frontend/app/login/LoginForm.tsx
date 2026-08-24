"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

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

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} required /></label>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
      {message && <p className="form-message" role="alert">{message}</p>}
      <p className="auth-form__switch">New here? <Link href="/signup">Create an account</Link></p>
    </form>
  );
}
