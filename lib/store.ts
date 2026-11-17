"use client";

import { useSyncExternalStore } from "react";

/*
 * All of the app's data lives here. In step 1 it is saved in the browser
 * (localStorage). Every screen reads and writes through the functions in this
 * file, so when sync is added later only this file has to change.
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
};

export type Note = {
  id: string;
  notebookId: string;
  topicId: string | null;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

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

const KEY = "notefy:v1";
const EMPTY: State = { notebooks: [], topics: [], notes: [] };

let state: State = EMPTY;
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
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

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  // Another tab changed the data: pick it up.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
  // Never lose the last few keystrokes when the tab is closed or hidden.
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function flush() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the data stays in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function commit(next: State) {
  state = next;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** True while a change is waiting to be written to storage. */
export function useSaving(): boolean {
  return useSyncExternalStore(subscribe, () => saveTimer !== null, () => false);
}

const noop = () => () => {};
/** False while the page is still the server-made shell, true once the browser's data is readable. */
export function useReady(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function touchNotebook(s: State, notebookId: string, now: number): Notebook[] {
  return s.notebooks.map((n) => (n.id === notebookId ? { ...n, updatedAt: now } : n));
}

export function createNotebook(className: string, templateId: string): string {
  ensureLoaded();
  const now = Date.now();
  const id = newId();
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const notebook: Notebook = {
    id,
    className: className.trim(),
    professor: "",
    location: "",
    time: "",
    email: "",
    createdAt: now,
    updatedAt: now,
  };
  const topics: Topic[] = template.topics.map((name, i) => ({
    id: newId(),
    notebookId: id,
    name,
    createdAt: now + i,
  }));
  commit({ ...state, notebooks: [...state.notebooks, notebook], topics: [...state.topics, ...topics] });
  return id;
}

export function updateNotebook(id: string, patch: Partial<Omit<Notebook, "id">>) {
  const now = Date.now();
  commit({
    ...state,
    notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
  });
}

export function deleteNotebook(id: string) {
  commit({
    notebooks: state.notebooks.filter((n) => n.id !== id),
    topics: state.topics.filter((t) => t.notebookId !== id),
    notes: state.notes.filter((n) => n.notebookId !== id),
  });
}

export function createTopic(notebookId: string, name: string): string {
  const now = Date.now();
  const id = newId();
  commit({
    ...state,
    notebooks: touchNotebook(state, notebookId, now),
    topics: [...state.topics, { id, notebookId, name, createdAt: now }],
  });
  return id;
}

export function renameTopic(id: string, name: string) {
  commit({ ...state, topics: state.topics.map((t) => (t.id === id ? { ...t, name } : t)) });
}

/** Deletes a topic and the notes inside it. */
export function deleteTopic(id: string) {
  commit({
    ...state,
    topics: state.topics.filter((t) => t.id !== id),
    notes: state.notes.filter((n) => n.topicId !== id),
  });
}

export function createNote(notebookId: string, topicId: string | null): string {
  const now = Date.now();
  const id = newId();
  commit({
    ...state,
    notebooks: touchNotebook(state, notebookId, now),
    notes: [...state.notes, { id, notebookId, topicId, title: "", body: "", createdAt: now, updatedAt: now }],
  });
  return id;
}

export function updateNote(id: string, patch: Partial<Pick<Note, "title" | "body">>) {
  const now = Date.now();
  const note = state.notes.find((n) => n.id === id);
  if (!note) return;
  commit({
    ...state,
    notebooks: touchNotebook(state, note.notebookId, now),
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
  });
}

export function deleteNote(id: string) {
  commit({ ...state, notes: state.notes.filter((n) => n.id !== id) });
}
