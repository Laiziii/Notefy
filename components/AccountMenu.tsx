"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Modal } from "./Dialog";
import { UserIcon } from "./Icons";

/** The account button in the top bar, and the dialog it opens. */
export function AccountMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  if (!auth.session) return null;

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Account" title="Account">
        <UserIcon />
      </button>
      {open && <AccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AccountDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const user = auth.session?.user;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function run(action: () => Promise<string | null>, onOk?: () => void) {
    setBusy(true);
    setError(null);
    const message = await action();
    setBusy(false);
    if (message) setError(message);
    else onOk?.();
  }

  if (!user) return null;
  const hasEmail = !!user.email;

  return (
    <Modal title="Account" onClose={onClose}>
      <div className="dialog-form">
        {!auth.isGuest && (
          <>
            <p className="dialog-text">
              Signed in as <strong>{user.email}</strong>.
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={onClose}>
                Close
              </button>
              <button
                className="btn danger"
                onClick={() =>
                  run(async () => {
                    await auth.signOut();
                    return null;
                  })
                }
              >
                Sign out
              </button>
            </div>
          </>
        )}

        {auth.isGuest && !hasEmail && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => auth.addEmailToGuest(email), () => setEmailSent(true));
            }}
          >
            <p className="dialog-text">
              You&apos;re using a guest account. It only exists on this device — add an email to keep your notes if you
              lose it, and sync them to your other devices.
            </p>
            {!emailSent ? (
              <>
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
                <div className="dialog-actions">
                  <button type="button" className="btn" onClick={onClose}>
                    Not now
                  </button>
                  <button className="btn primary" type="submit" disabled={busy}>
                    {busy ? "Sending…" : "Send confirmation link"}
                  </button>
                </div>
              </>
            ) : (
              <p className="dialog-text">
                We sent a link to <strong>{email}</strong>. Open it on this device, then come back here to set a
                password.
              </p>
            )}
          </form>
        )}

        {auth.isGuest && hasEmail && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => auth.setPassword(password));
            }}
          >
            <p className="dialog-text">
              Almost done — <strong>{user.email}</strong> needs to be confirmed. Check your email on this device and
              tap the link, then set a password below.
            </p>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            {error && <p className="gate-error">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose}>
                Not now
              </button>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Set password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
