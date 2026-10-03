"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("resend", { email, redirect: false });
    if (result?.error) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
          <p className="text-zinc-600">
            We sent a sign-in link to <strong>{email}</strong>. Click it to sign in.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="text-sm text-red-700 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎅</div>
          <h1 className="text-3xl font-bold text-zinc-900">Secret Santa</h1>
          <p className="mt-2 text-zinc-600">Sign in to manage your Secret Santa</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 px-4 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending..." : "Send me a magic link"}
          </button>
        </form>
      </div>
    </div>
  );
}
