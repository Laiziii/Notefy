"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { migrateLegacyLocalData } from "./migrate";
import { attachUser, detachUser } from "./store";
import { supabase, supabaseConfigured } from "./supabase";

type AuthState = {
  /** True once Supabase is configured and the app knows whether there is a session yet. */
  ready: boolean;
  session: Session | null;
  /** A guest account (no email attached) vs. a real one. */
  isGuest: boolean;
  signInGuest: () => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  sendSignInLink: (email: string) => Promise<string | null>;
  /** Step 1 of turning a guest into a real account: attach an email, which sends a confirmation link. */
  addEmailToGuest: (email: string) => Promise<string | null>;
  /** Step 2, once that email is confirmed: set a password. */
  setPassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const siteUrl = () => (typeof window === "undefined" ? "" : window.location.origin);

/** Turns a Supabase error into a short, plain sentence instead of its raw message. */
function friendlyError(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  const m = error.message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match an account.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "An account already exists for that email. Try signing in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first, then try again.";
  if (m.includes("password") && m.includes("character")) return "Password must be at least 6 characters.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Too many attempts. Wait a minute and try again.";
  if (m.includes("identity is already linked") || m.includes("already been registered"))
    return "An account already exists for that email. Sign out and sign in with that email instead.";
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
      if (next?.user) {
        // Finish copying any leftover local notes in BEFORE the first fetch,
        // so that fetch already includes them (a fetch started first could
        // otherwise miss inserts the migration makes a moment later).
        const userId = next.user.id;
        migrateLegacyLocalData(client, userId).then(() => attachUser(client, userId));
      } else {
        detachUser();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      isGuest: session?.user?.is_anonymous === true,
      async signInGuest() {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.signInAnonymously();
        return friendlyError(error);
      },
      async signInWithPassword(email, password) {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return friendlyError(error);
      },
      async signUpWithPassword(email, password) {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: siteUrl() },
        });
        return friendlyError(error);
      },
      async sendSignInLink(email) {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: siteUrl() },
        });
        return friendlyError(error);
      },
      async addEmailToGuest(email) {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: siteUrl() });
        return friendlyError(error);
      },
      async setPassword(password) {
        if (!supabase) return "Accounts aren't set up yet.";
        const { error } = await supabase.auth.updateUser({ password });
        return friendlyError(error);
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const notConfigured = async () => "Accounts aren't set up yet.";
/** Used outside AuthProvider, i.e. whenever Supabase isn't configured: there is no session, and nothing to do. */
const inertAuth: AuthState = {
  ready: true,
  session: null,
  isGuest: false,
  signInGuest: notConfigured,
  signInWithPassword: notConfigured,
  signUpWithPassword: notConfigured,
  sendSignInLink: notConfigured,
  addEmailToGuest: notConfigured,
  setPassword: notConfigured,
  signOut: async () => {},
};

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? inertAuth;
}
