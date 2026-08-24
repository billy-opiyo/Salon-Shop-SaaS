import Link from "next/link";

import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <Link className="brand-mark" href="/">Salon Store Platform</Link>
        <p className="eyebrow">Start your workspace</p>
        <h1 id="signup-title">Create your account.</h1>
        <p className="auth-card__intro">Your salon store and plan selection will follow account verification.</p>
        <SignupForm />
      </section>
    </main>
  );
}
