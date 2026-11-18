"use client";

import type { ReactNode } from "react";
import { AuthGate } from "./AuthGate";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";

function Gate({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  if (!ready) return null; // A moment while Supabase checks for an existing session.
  if (!session) return <AuthGate />;
  return <>{children}</>;
}

/** Turns on accounts and sync once Supabase is configured; otherwise the app behaves exactly as before. */
export function AppShell({ children }: { children: ReactNode }) {
  if (!supabaseConfigured) return <>{children}</>;
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
