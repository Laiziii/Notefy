"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

type Mode = "start" | "link" | "link-sent" | "password" | "password-sent";

/** Shown before anyone has a session: choose guest, an email link, or a password. */
export function AuthGate() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const message = await action();
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <h1 className="gate-title">Notefy</h1>
        <p className="gate-sub">Simple, comfortable notes for your classes.</p>

        {mode === "start" && (
          <div className="gate-body">
            <button className="btn primary gate-main" disabled={busy} onClick={() => run(auth.signInGuest)}>
              Continue as guest
            </button>
            <p className="gate-hint">
              Start right away, no email needed. Notes stay on this device until you add an email.
              {" "}
              Any notes already on this device come with you.
            </p>
            <div className="gate-divider">
              <span>or</span>
            </div>
            <button className="btn gate-main" onClick={() => setMode("link")}>
              Sign in with an email link
            </button>
            <button className="btn gate-main" onClick={() => setMode("password")}>
              Sign in with a password
            </button>
          </div>
        )}

        {mode === "link" && (
          <form
            className="gate-body"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const message = await auth.sendSignInLink(email);
                if (!message) setMode("link-sent");
                return message;
              });
            }}
          >
            <label className="field">
              <span>Email</span>
              <input
                autoFocus
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </label>
            {error && <p className="gate-error">{error}</p>}
            <button className="btn primary gate-main" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send sign-in link"}
            </button>
            <button type="button" className="link gate-back" onClick={() => setMode("start")}>
              Back
            </button>
          </form>
        )}

        {mode === "link-sent" && (
          <div className="gate-body">
            <p className="gate-hint">
              We sent a link to <strong>{email}</strong>. Open it on this device to continue — your notebooks will
              be waiting right here.
            </p>
            <button className="link gate-back" onClick={() => setMode("start")}>
              Back
            </button>
          </div>
        )}

        {mode === "password-sent" && (
          <div className="gate-body">
            <p className="gate-hint">
              We sent a confirmation link to <strong>{email}</strong>. Open it on this device, then sign in with
              your password.
            </p>
            <button
              className="link gate-back"
              onClick={() => {
                setMode("password");
                setIsSignUp(false);
              }}
            >
              Back to sign in
            </button>
          </div>
        )}

        {mode === "password" && (
          <form
            className="gate-body"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (!isSignUp) return auth.signInWithPassword(email, password);
                const message = await auth.signUpWithPassword(email, password);
                if (!message) setMode("password-sent");
                return message;
              });
            }}
          >
            <label className="field">
              <span>Email</span>
              <input
                autoFocus
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "At least 6 characters" : "Your password"}
              />
            </label>
            {isSignUp && (
              <p className="gate-hint">We&apos;ll send a confirmation link to that email before you can sign in.</p>
            )}
            {error && <p className="gate-error">{error}</p>}
            <button className="btn primary gate-main" type="submit" disabled={busy}>
              {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="link gate-back"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            <button type="button" className="link gate-back" onClick={() => setMode("start")}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
