import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Step 1 saved everything in this browser's localStorage, under one key.
 * The first time this browser signs in to an account, whatever is still
 * there is copied up to that account, once. After that this is a no-op.
 */

const LEGACY_KEY = "notefy:v1";
const migratedFlag = (userId: string) => `notefy:migrated:${userId}`;

type LegacyNotebook = {
  id: string;
  className: string;
  professor: string;
  location: string;
  time: string;
  email: string;
  createdAt: number;
  updatedAt: number;
};
type LegacyTopic = { id: string; notebookId: string; name: string; createdAt: number; collapsed?: boolean };
type LegacyNote = {
  id: string;
  notebookId: string;
  topicId: string | null;
  title: string;
  body: string;
  bodyHtml?: string;
  aiHtml?: string;
  aiText?: string;
  font?: string;
  fontSize?: number;
  spacing?: "single" | "double";
  createdAt: number;
  updatedAt: number;
};
type LegacyState = { notebooks: LegacyNotebook[]; topics: LegacyTopic[]; notes: LegacyNote[] };

const iso = (ms: number) => new Date(ms).toISOString();

/** Uploads this browser's leftover step-1 notes to `userId`'s account, once per browser per account. */
export async function migrateLegacyLocalData(supabase: SupabaseClient, userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const flag = migratedFlag(userId);
  try {
    if (localStorage.getItem(flag)) return;
  } catch {
    return; // No storage access: nothing to read, nothing to mark done.
  }

  let data: LegacyState | null = null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.notebooks)) data = parsed;
    }
  } catch {
    data = null;
  }

  if (data && data.notebooks.length) {
    const notebookRows = data.notebooks.map((n) => ({
      id: n.id,
      user_id: userId,
      class_name: n.className,
      professor: n.professor,
      location: n.location,
      class_time: n.time,
      email: n.email,
      created_at: iso(n.createdAt),
      updated_at: iso(n.updatedAt),
    }));
    const topicRows = (data.topics ?? []).map((t) => ({
      id: t.id,
      user_id: userId,
      notebook_id: t.notebookId,
      name: t.name,
      collapsed: !!t.collapsed,
      created_at: iso(t.createdAt),
    }));
    const noteRows = (data.notes ?? []).map((n) => ({
      id: n.id,
      user_id: userId,
      notebook_id: n.notebookId,
      topic_id: n.topicId,
      title: n.title,
      body: n.body,
      body_html: n.bodyHtml ?? "",
      ai_html: n.aiHtml ?? "",
      ai_text: n.aiText ?? "",
      font: n.font ?? null,
      font_size: n.fontSize ?? null,
      spacing: n.spacing ?? null,
      created_at: iso(n.createdAt),
      updated_at: iso(n.updatedAt),
    }));

    // Parents before children, so the foreign keys resolve.
    const { error: nbErr } = await supabase.from("notebooks").upsert(notebookRows);
    if (nbErr) {
      console.error("Notefy: could not move your existing notebooks to your account.", nbErr);
      return; // Leave the flag unset so this is tried again next time.
    }
    if (topicRows.length) {
      const { error } = await supabase.from("topics").upsert(topicRows);
      if (error) console.error("Notefy: could not move your existing topics to your account.", error);
    }
    if (noteRows.length) {
      const { error } = await supabase.from("notes").upsert(noteRows);
      if (error) console.error("Notefy: could not move your existing notes to your account.", error);
    }
  }

  try {
    localStorage.setItem(flag, "1");
  } catch {}
}
