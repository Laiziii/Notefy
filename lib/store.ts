"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { supabaseConfigured } from "./supabase";

/*
 * All of the app's data lives here. Every screen reads and writes through
 * the functions in this file.
 *
 * Two modes, chosen once at startup by whether Supabase is configured:
 *  - No account system yet: everything is saved in this browser only
 *    (localStorage), exactly like step 1.
 *  - Signed in: everything is saved to your Supabase project and kept in
 *    sync with your other devices. attachUser()/detachUser() (called from
 *    lib/auth.tsx) switch this on and off.
 */

export type Notebook = {
  id: string;
  className: string;
  professor: string;
  location: string;
  time: string;
  email: string;
  createdAt: number;
  updatedAt: number;
};

export type Topic = {
  id: string;
  notebookId: string;
  name: string;
  createdAt: number;
  collapsed?: boolean;
};

export type Note = {
  id: string;
  notebookId: string;
  topicId: string | null;
  title: string;
  /** Plain text of "My notes", used for search and previews. */
  body: string;
  /** Formatted content of "My notes". Missing on notes written before the toolbar existed. */
  bodyHtml?: string;
  /** The AI summary panel: formatted content and its plain text. */
  aiHtml?: string;
  aiText?: string;
  /** Whole-note look, chosen from the toolbar. */
  font?: string;
  fontSize?: number;
  spacing?: "single" | "double";
  createdAt: number;
  updatedAt: number;
};

export type NotePatch = Partial<Omit<Note, "id" | "notebookId" | "createdAt" | "updatedAt">>;
export type NotebookDetails = Pick<Notebook, "className" | "professor" | "location" | "time" | "email">;

export type State = {
  notebooks: Notebook[];
  topics: Topic[];
  notes: Note[];
};

export type Template = { id: string; name: string; hint: string; topics: string[] };

export const TEMPLATES: Template[] = [
  { id: "blank", name: "Blank", hint: "Start empty and add your own topics", topics: [] },
  {
    id: "lecture",
    name: "Lecture class",
    hint: "Lectures, Readings, Exam prep",
    topics: ["Lectures", "Readings", "Exam prep"],
  },
  {
    id: "lab",
    name: "Lab class",
    hint: "Lectures, Labs, Lab reports",
    topics: ["Lectures", "Labs", "Lab reports"],
  },
  {
    id: "seminar",
    name: "Seminar",
    hint: "Weekly discussions, Readings, Essay ideas",
    topics: ["Weekly discussions", "Readings", "Essay ideas"],
  },
];

const EMPTY: State = { notebooks: [], topics: [], notes: [] };

let state: State = EMPTY;
let ready = false; // set true once data is available, either way
let saving = false;
const listeners = new Set<() => void>();
const savingListeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}
function setReady(next: boolean) {
  if (ready === next) return;
  ready = next;
  listeners.forEach((l) => l());
}
function setSaving(next: boolean) {
  if (saving === next) return;
  saving = next;
  savingListeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function subscribeSaving(listener: () => void) {
  savingListeners.add(listener);
  return () => savingListeners.delete(listener);
}

export function useStore(): State {
  if (!supabaseConfigured) ensureLocalLoaded();
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** False while there is nothing to show yet: the server-made shell, or data still loading. */
export function useReady(): boolean {
  if (!supabaseConfigured) ensureLocalLoaded();
  return useSyncExternalStore(
    subscribe,
    () => (supabaseConfigured ? ready : localLoaded),
    () => (supabaseConfigured ? ready : localLoaded),
  );
}
/** True while a change is waiting to be written. */
export function useSaving(): boolean {
  return useSyncExternalStore(subscribeSaving, () => saving, () => saving);
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ----------------------------------------------------------------------- */
/* Local-only mode (no Supabase configured): same as step 1.               */
/* ----------------------------------------------------------------------- */

const LOCAL_KEY = "notefy:v1";
let localLoaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readLocal(): State {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return EMPTY;
  }
}

function ensureLocalLoaded() {
  if (localLoaded || typeof window === "undefined") return;
  localLoaded = true;
  state = readLocal();
  listeners.forEach((l) => l());
  window.addEventListener("storage", (e) => {
    if (e.key !== LOCAL_KEY) return;
    setState(readLocal());
  });
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function commitLocal(next: State) {
  setState(next);
  if (saveTimer) clearTimeout(saveTimer);
  setSaving(true);
  saveTimer = setTimeout(flushLocal, 250);
}

function flushLocal() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the data stays in memory for this visit.
  }
  setSaving(false);
}

/* ----------------------------------------------------------------------- */
/* Account mode: Supabase is the source of truth, kept live with realtime. */
/* ----------------------------------------------------------------------- */

let remoteUserId: string | null = null;
let remoteClient: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
const pendingWrites = new Map<string, { timer: ReturnType<typeof setTimeout>; row: Record<string, unknown> }>();
let inFlightCount = 0;

const bumpInFlight = (delta: number) => setSaving((inFlightCount += delta) > 0);

const notebookToRow = (n: Partial<NotebookDetails>) => ({
  ...(n.className !== undefined && { class_name: n.className }),
  ...(n.professor !== undefined && { professor: n.professor }),
  ...(n.location !== undefined && { location: n.location }),
  ...(n.time !== undefined && { class_time: n.time }),
  ...(n.email !== undefined && { email: n.email }),
});
const rowToNotebook = (r: NotebookRow): Notebook => ({
  id: r.id,
  className: r.class_name ?? "",
  professor: r.professor ?? "",
  location: r.location ?? "",
  time: r.class_time ?? "",
  email: r.email ?? "",
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
});

type NotebookRow = {
  id: string;
  class_name: string | null;
  professor: string | null;
  location: string | null;
  class_time: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};
type TopicRow = { id: string; notebook_id: string; name: string | null; collapsed: boolean | null; created_at: string };
type NoteRow = {
  id: string;
  notebook_id: string;
  topic_id: string | null;
  title: string | null;
  body: string | null;
  body_html: string | null;
  ai_html: string | null;
  ai_text: string | null;
  font: string | null;
  font_size: number | null;
  spacing: string | null;
  created_at: string;
  updated_at: string;
};

const topicToRow = (t: Partial<Pick<Topic, "name" | "collapsed">>) => ({
  ...(t.name !== undefined && { name: t.name }),
  ...(t.collapsed !== undefined && { collapsed: t.collapsed }),
});
const rowToTopic = (r: TopicRow): Topic => ({
  id: r.id,
  notebookId: r.notebook_id,
  name: r.name ?? "",
  collapsed: !!r.collapsed,
  createdAt: Date.parse(r.created_at),
});

const noteToRow = (n: NotePatch) => ({
  ...(n.title !== undefined && { title: n.title }),
  ...(n.body !== undefined && { body: n.body }),
  ...(n.bodyHtml !== undefined && { body_html: n.bodyHtml }),
  ...(n.aiHtml !== undefined && { ai_html: n.aiHtml }),
  ...(n.aiText !== undefined && { ai_text: n.aiText }),
  ...(n.font !== undefined && { font: n.font ?? null }),
  ...(n.fontSize !== undefined && { font_size: n.fontSize ?? null }),
  ...(n.spacing !== undefined && { spacing: n.spacing ?? null }),
});
const rowToNote = (r: NoteRow): Note => ({
  id: r.id,
  notebookId: r.notebook_id,
  topicId: r.topic_id,
  title: r.title ?? "",
  body: r.body ?? "",
  bodyHtml: r.body_html || undefined,
  aiHtml: r.ai_html || undefined,
  aiText: r.ai_text || undefined,
  font: r.font ?? undefined,
  fontSize: r.font_size ?? undefined,
  spacing: (r.spacing as Note["spacing"]) ?? undefined,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
});

/** Starts loading `userId`'s notebooks and keeping them live. Called from lib/auth.tsx on sign-in. */
export async function attachUser(client: SupabaseClient, userId: string) {
  if (remoteUserId === userId) return;
  detachUser();
  remoteUserId = userId;
  remoteClient = client;
  setReady(false);

  const [{ data: notebooks, error: e1 }, { data: topics, error: e2 }, { data: notes, error: e3 }] =
    await Promise.all([
      client.from("notebooks").select("*").eq("user_id", userId),
      client.from("topics").select("*").eq("user_id", userId),
      client.from("notes").select("*").eq("user_id", userId),
    ]);
  if (remoteUserId !== userId) return; // Switched accounts again while this was loading.
  if (e1 || e2 || e3) {
    console.error("Notefy: could not load your notebooks.", e1 ?? e2 ?? e3);
  }
  // Keep anything created while this fetch was in flight: this result was asked
  // for before that happened, so it can't know about it yet, and replacing the
  // whole state with it would otherwise make that new thing vanish.
  const keepUnseen = <T extends { id: string }>(fetched: T[], current: T[]): T[] => {
    const fetchedIds = new Set(fetched.map((r) => r.id));
    return [...fetched, ...current.filter((r) => !fetchedIds.has(r.id))];
  };
  setState({
    notebooks: keepUnseen((notebooks ?? []).map(rowToNotebook), state.notebooks),
    topics: keepUnseen((topics ?? []).map(rowToTopic), state.topics),
    notes: keepUnseen((notes ?? []).map(rowToNote), state.notes),
  });
  setReady(true);

  channel = client
    .channel(`notefy-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notebooks", filter: `user_id=eq.${userId}` }, (p) =>
      applyRemoteChange("notebooks", p),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "topics", filter: `user_id=eq.${userId}` }, (p) =>
      applyRemoteChange("topics", p),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` }, (p) =>
      applyRemoteChange("notes", p),
    )
    .subscribe();

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushRemote);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushRemote();
    });
  }
}

/** Stops syncing and clears what's on screen. Called from lib/auth.tsx on sign-out. */
export function detachUser() {
  if (!remoteUserId) return;
  flushRemote();
  channel?.unsubscribe();
  channel = null;
  remoteUserId = null;
  remoteClient = null;
  setState(EMPTY);
  setReady(false);
}

type Payload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown>; old: Record<string, unknown> };

function applyRemoteChange(table: "notebooks" | "topics" | "notes", payload: Payload) {
  const key = `${table}:${(payload.new?.id ?? payload.old?.id) as string}`;
  if (payload.eventType !== "DELETE" && pendingWrites.has(key)) return; // We have a newer local edit in flight.

  if (payload.eventType === "DELETE") {
    const id = payload.old.id as string;
    if (table === "notebooks") {
      setState({
        notebooks: state.notebooks.filter((n) => n.id !== id),
        topics: state.topics.filter((t) => t.notebookId !== id),
        notes: state.notes.filter((n) => n.notebookId !== id),
      });
    } else if (table === "topics") {
      setState({ ...state, topics: state.topics.filter((t) => t.id !== id) });
    } else {
      setState({ ...state, notes: state.notes.filter((n) => n.id !== id) });
    }
    return;
  }

  if (table === "notebooks") {
    const row = rowToNotebook(payload.new as unknown as NotebookRow);
    const exists = state.notebooks.some((n) => n.id === row.id);
    setState({
      ...state,
      notebooks: exists ? state.notebooks.map((n) => (n.id === row.id ? row : n)) : [...state.notebooks, row],
    });
  } else if (table === "topics") {
    const row = rowToTopic(payload.new as unknown as TopicRow);
    const exists = state.topics.some((t) => t.id === row.id);
    setState({ ...state, topics: exists ? state.topics.map((t) => (t.id === row.id ? row : t)) : [...state.topics, row] });
  } else {
    const row = rowToNote(payload.new as unknown as NoteRow);
    const exists = state.notes.some((n) => n.id === row.id);
    setState({ ...state, notes: exists ? state.notes.map((n) => (n.id === row.id ? row : n)) : [...state.notes, row] });
  }
}

/** Debounces writes per row, the same way typing used to be debounced to localStorage. */
function scheduleWrite(table: "notebooks" | "topics" | "notes", id: string, row: Record<string, unknown>) {
  const key = `${table}:${id}`;
  const existing = pendingWrites.get(key);
  const merged = { ...existing?.row, ...row };
  if (existing) clearTimeout(existing.timer);
  else bumpInFlight(1);
  const timer = setTimeout(() => sendWrite(table, id, key), 250);
  pendingWrites.set(key, { timer, row: merged });
}

async function sendWrite(table: "notebooks" | "topics" | "notes", id: string, key: string) {
  const pending = pendingWrites.get(key);
  if (!pending || !remoteClient) return;
  pendingWrites.delete(key);
  const { error } = await remoteClient.from(table).update(pending.row).eq("id", id);
  if (error) console.error(`Notefy: could not save a change to ${table}.`, error);
  bumpInFlight(-1);
}

/** Sends every change that's still waiting, right away. Used before the tab closes or hides. */
function flushRemote() {
  if (!remoteClient) return;
  for (const [key, pending] of pendingWrites) {
    clearTimeout(pending.timer);
    const [table, id] = key.split(":") as ["notebooks" | "topics" | "notes", string];
    pendingWrites.delete(key);
    remoteClient
      .from(table)
      .update(pending.row)
      .eq("id", id)
      .then(({ error }: { error: unknown }) => {
        if (error) console.error(`Notefy: could not save a change to ${table}.`, error);
        bumpInFlight(-1);
      });
  }
}

async function insertRow(table: "notebooks" | "topics" | "notes", row: Record<string, unknown>) {
  if (!remoteClient || !remoteUserId) return;
  bumpInFlight(1);
  const { error } = await remoteClient.from(table).insert({ ...row, user_id: remoteUserId });
  if (error) console.error(`Notefy: could not save a new ${table.slice(0, -1)}.`, error);
  bumpInFlight(-1);
}

async function deleteRow(table: "notebooks" | "topics" | "notes", id: string) {
  pendingWrites.delete(`${table}:${id}`);
  if (!remoteClient) return;
  bumpInFlight(1);
  const { error } = await remoteClient.from(table).delete().eq("id", id);
  if (error) console.error(`Notefy: could not delete that ${table.slice(0, -1)}.`, error);
  bumpInFlight(-1);
}

/** Sends every change that's still waiting, right away, in whichever mode is active. */
export function flush() {
  if (supabaseConfigured) flushRemote();
  else flushLocal();
}

/* ----------------------------------------------------------------------- */
/* Public actions. Each updates what's on screen immediately, then saves.  */
/* ----------------------------------------------------------------------- */

function touchNotebook(s: State, notebookId: string, now: number): Notebook[] {
  return s.notebooks.map((n) => (n.id === notebookId ? { ...n, updatedAt: now } : n));
}

export function createNotebook(details: NotebookDetails, templateId: string): string {
  const now = Date.now();
  const id = newId();
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const notebook: Notebook = {
    id,
    className: details.className.trim(),
    professor: details.professor.trim(),
    location: details.location.trim(),
    time: details.time.trim(),
    email: details.email.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const topics: Topic[] = template.topics.map((name, i) => ({
    id: newId(),
    notebookId: id,
    name,
    createdAt: now + i,
  }));

  if (supabaseConfigured) {
    setState({ ...state, notebooks: [...state.notebooks, notebook], topics: [...state.topics, ...topics] });
    insertRow("notebooks", { id, ...notebookToRow(notebook) });
    topics.forEach((t) => insertRow("topics", { id: t.id, notebook_id: id, ...topicToRow(t) }));
  } else {
    ensureLocalLoaded();
    commitLocal({ ...state, notebooks: [...state.notebooks, notebook], topics: [...state.topics, ...topics] });
  }
  return id;
}

export function updateNotebook(id: string, patch: Partial<Omit<Notebook, "id">>) {
  const now = Date.now();
  const next = { ...state, notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)) };
  if (supabaseConfigured) {
    setState(next);
    scheduleWrite("notebooks", id, notebookToRow(patch));
  } else {
    commitLocal(next);
  }
}

export function deleteNotebook(id: string) {
  const next: State = {
    notebooks: state.notebooks.filter((n) => n.id !== id),
    topics: state.topics.filter((t) => t.notebookId !== id),
    notes: state.notes.filter((n) => n.notebookId !== id),
  };
  if (supabaseConfigured) {
    setState(next);
    deleteRow("notebooks", id);
  } else {
    commitLocal(next);
  }
}

export function createTopic(notebookId: string, name: string): string {
  const now = Date.now();
  const id = newId();
  const topic: Topic = { id, notebookId, name, createdAt: now };
  const next = { ...state, notebooks: touchNotebook(state, notebookId, now), topics: [...state.topics, topic] };
  if (supabaseConfigured) {
    setState(next);
    insertRow("topics", { id, notebook_id: notebookId, ...topicToRow(topic) });
  } else {
    commitLocal(next);
  }
  return id;
}

export function updateTopic(id: string, patch: Partial<Pick<Topic, "name" | "collapsed">>) {
  const next = { ...state, topics: state.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
  if (supabaseConfigured) {
    setState(next);
    scheduleWrite("topics", id, topicToRow(patch));
  } else {
    commitLocal(next);
  }
}

/** Deletes a topic and the notes inside it. */
export function deleteTopic(id: string) {
  const next = {
    ...state,
    topics: state.topics.filter((t) => t.id !== id),
    notes: state.notes.filter((n) => n.topicId !== id),
  };
  if (supabaseConfigured) {
    setState(next);
    deleteRow("topics", id);
  } else {
    commitLocal(next);
  }
}

export function createNote(notebookId: string, topicId: string | null): string {
  const now = Date.now();
  const id = newId();
  const note: Note = { id, notebookId, topicId, title: "", body: "", createdAt: now, updatedAt: now };
  const next = { ...state, notebooks: touchNotebook(state, notebookId, now), notes: [...state.notes, note] };
  if (supabaseConfigured) {
    setState(next);
    insertRow("notes", { id, notebook_id: notebookId, topic_id: topicId, ...noteToRow(note) });
  } else {
    commitLocal(next);
  }
  return id;
}

export function updateNote(id: string, patch: NotePatch) {
  const now = Date.now();
  const note = state.notes.find((n) => n.id === id);
  if (!note) return;
  const next = {
    ...state,
    notebooks: touchNotebook(state, note.notebookId, now),
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
  };
  if (supabaseConfigured) {
    setState(next);
    scheduleWrite("notes", id, noteToRow(patch));
  } else {
    commitLocal(next);
  }
}

export function deleteNote(id: string) {
  const next = { ...state, notes: state.notes.filter((n) => n.id !== id) };
  if (supabaseConfigured) {
    setState(next);
    deleteRow("notes", id);
  } else {
    commitLocal(next);
  }
}
