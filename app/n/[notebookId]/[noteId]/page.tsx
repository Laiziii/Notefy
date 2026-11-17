"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BackIcon, CloseIcon, SourceIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { updateNote, useReady, useSaving, useStore } from "@/lib/store";

export default function NotePage() {
  const { notebookId, noteId } = useParams<{ notebookId: string; noteId: string }>();
  const ready = useReady();
  const store = useStore();
  const note = store.notes.find((n) => n.id === noteId);
  const notebook = store.notebooks.find((n) => n.id === notebookId);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [panel, setPanel] = useState<"mine" | "ai">("mine"); // phones show one panel at a time
  const saved = !useSaving();

  useEffect(() => {
    if (!sourceOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSourceOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourceOpen]);

  if (!ready) return <div className="page" />;
  if (!note) {
    return (
      <div className="page">
        <main className="column">
          <p className="empty">This note does not exist on this device.</p>
          <Link className="btn" href={notebook ? `/n/${notebookId}` : "/"}>
            Go back
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="page note-page">
      <header className="topbar">
        <Link className="back-link" href={`/n/${notebookId}`} aria-label="Back to notebook">
          <BackIcon />
          <span>{notebook?.className || "Notebook"}</span>
        </Link>
        <span className="spacer" />
        <span className="saved" aria-live="polite">
          {saved ? "Saved" : "Saving…"}
        </span>
        <button
          className={`btn small${sourceOpen ? " active" : ""}`}
          onClick={() => setSourceOpen((o) => !o)}
          aria-expanded={sourceOpen}
        >
          <SourceIcon /> Source
        </button>
        <ThemeToggle />
      </header>

      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={panel === "mine"} onClick={() => setPanel("mine")}>
          My notes
        </button>
        <button role="tab" aria-selected={panel === "ai"} onClick={() => setPanel("ai")}>
          AI summary
        </button>
      </div>

      <div className="panels" data-show={panel}>
        <section className="panel mine" aria-label="My notes">
          <div className="panel-inner">
            <input
              className="note-title"
              value={note.title}
              placeholder="Untitled"
              aria-label="Note title"
              onChange={(e) => updateNote(noteId, { title: e.target.value })}
            />
            <textarea
              className="note-body"
              value={note.body}
              placeholder="Start typing your notes…"
              aria-label="Your notes"
              onChange={(e) => updateNote(noteId, { body: e.target.value })}
            />
          </div>
        </section>

        <section className="panel ai" aria-label="AI summary">
          <div className="panel-inner">
            <h2 className="panel-label">AI summary</h2>
            <div className="placeholder">
              <p>The AI summary of your source will appear here, beside your notes.</p>
              <p>It is always a suggestion. It never changes what you wrote on the left.</p>
              <p className="soon">Coming in step 5</p>
            </div>
          </div>
        </section>
      </div>

      <aside className={`drawer${sourceOpen ? " open" : ""}`} aria-label="Source" aria-hidden={!sourceOpen}>
        <div className="drawer-head">
          <h2>Source</h2>
          <button className="icon-btn" onClick={() => setSourceOpen(false)} aria-label="Hide source" tabIndex={sourceOpen ? 0 : -1}>
            <CloseIcon />
          </button>
        </div>
        <div className="placeholder">
          <p>Your uploaded lecture notes (PDF, Word, photos or pasted text) will live here.</p>
          <p>Open it to check something, then slide it away. Hiding it never deletes it.</p>
          <p className="soon">Coming in step 4</p>
        </div>
      </aside>
    </div>
  );
}
