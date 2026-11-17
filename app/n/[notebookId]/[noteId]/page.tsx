"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, CloseIcon, SourceIcon, SparkIcon } from "@/components/Icons";
import { NoteToolbar } from "@/components/NoteToolbar";
import { type Editor, RichEditor, textToHtml } from "@/components/RichEditor";
import { NoteSkeleton } from "@/components/Skeletons";
import { TitleInput } from "@/components/TitleInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEFAULT_FONT_SIZE, ensureFont, ensureFontsIn, fontByName } from "@/lib/fonts";
import { type Note, type Notebook, type NotePatch, updateNote, useReady, useSaving, useStore } from "@/lib/store";

export default function NotePage() {
  return (
    <Suspense fallback={<NoteSkeleton />}>
      <NoteRoute />
    </Suspense>
  );
}

function NoteRoute() {
  const { notebookId, noteId } = useParams<{ notebookId: string; noteId: string }>();
  const ready = useReady();
  const store = useStore();
  const note = store.notes.find((n) => n.id === noteId);
  const notebook = store.notebooks.find((n) => n.id === notebookId);

  if (!ready) return <NoteSkeleton />;
  if (!note) {
    return (
      <div className="page">
        <main className="column">
          <div className="empty">
            <p>This note does not exist on this device.</p>
            <Link className="btn" href={notebook ? `/n/${notebookId}` : "/"}>
              Go back
            </Link>
          </div>
        </main>
      </div>
    );
  }
  return <NoteScreen key={note.id} note={note} notebook={notebook} />;
}

/* How you last arranged the panels, remembered on this device. */
type Layout = { split: number; aiOpen: boolean; sourceOpen: boolean };
const LAYOUT_KEY = "notefy:layout";
const DEFAULT_LAYOUT: Layout = { split: 0.5, aiOpen: true, sourceOpen: false };
const clampSplit = (n: number) => Math.min(0.8, Math.max(0.2, n));

function readLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    return {
      split: typeof saved.split === "number" ? clampSplit(saved.split) : DEFAULT_LAYOUT.split,
      aiOpen: saved.aiOpen !== false,
      sourceOpen: saved.sourceOpen === true,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

const LINE_HEIGHTS = { single: 1.35, comfortable: 1.7, double: 2.4 };

function NoteScreen({ note, notebook }: { note: Note; notebook: Notebook | undefined }) {
  const saved = !useSaving();
  const [layout, setLayout] = useState(readLayout);
  const [tab, setTab] = useState<"mine" | "ai" | "source">("mine"); // phones show one panel at a time
  const [mineEditor, setMineEditor] = useState<Editor | null>(null);
  const [aiEditor, setAiEditor] = useState<Editor | null>(null);
  const [active, setActive] = useState<"mine" | "ai">("mine");

  const mineRef = useRef<HTMLElement>(null);
  const aiRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  // The content each editor starts with. Read once; after that the editor owns what is on screen.
  const [initial] = useState(() => ({
    mine: note.bodyHtml ?? textToHtml(note.body),
    ai: note.aiHtml ?? "",
  }));

  useEffect(() => {
    ensureFontsIn(initial.mine);
    ensureFontsIn(initial.ai);
  }, [initial]);
  useEffect(() => ensureFont(fontByName(note.font)), [note.font]);

  const changeLayout = useCallback((patch: Partial<Layout>) => {
    setLayout((old) => {
      const next = { ...old, ...patch };
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const save = useCallback((patch: NotePatch) => updateNote(note.id, patch), [note.id]);

  function dragTo(clientX: number) {
    if (!mineRef.current || !aiRef.current) return;
    const left = mineRef.current.getBoundingClientRect().left;
    const right = aiRef.current.getBoundingClientRect().right;
    if (right > left) changeLayout({ split: clampSplit((clientX - left) / (right - left)) });
  }

  const typography = {
    fontFamily: fontByName(note.font)?.stack,
    fontSize: note.fontSize ?? DEFAULT_FONT_SIZE,
    lineHeight: LINE_HEIGHTS[note.spacing ?? "comfortable"],
  };
  const activeEditor = active === "ai" && layout.aiOpen ? aiEditor : mineEditor;

  return (
    <div className="page note-page">
      <header className="topbar">
        <Link className="back-link" href={`/n/${note.notebookId}`} aria-label="Back to notebook">
          <BackIcon />
          <span>{notebook?.className || "Notebook"}</span>
        </Link>
        <span className="spacer" />
        <span className="saved" aria-live="polite">
          {saved ? "Saved" : "Saving…"}
        </span>
        {!layout.aiOpen && (
          <button className="btn small desktop-only" onClick={() => changeLayout({ aiOpen: true })}>
            <SparkIcon /> Show AI summary
          </button>
        )}
        <ThemeToggle />
      </header>

      <NoteToolbar
        editor={activeEditor}
        editors={[mineEditor, aiEditor].filter((e): e is Editor => !!e)}
        note={note}
        onNoteStyle={save}
      />

      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          My notes
        </button>
        <button role="tab" aria-selected={tab === "ai"} onClick={() => setTab("ai")}>
          AI summary
        </button>
        <button role="tab" aria-selected={tab === "source"} onClick={() => setTab("source")}>
          Source
        </button>
      </div>

      <div
        className="workspace"
        data-tab={tab}
        data-ai={layout.aiOpen ? "open" : "closed"}
        data-source={layout.sourceOpen ? "open" : "closed"}
        style={{ "--split": layout.split } as React.CSSProperties}
      >
        <section ref={mineRef} className="panel mine" aria-label="My notes">
          <div className="panel-inner">
            <div className="panel-head">
              <h2 className="panel-label">My notes</h2>
            </div>
            <TitleInput value={note.title} onChange={(title) => save({ title })} />
            <div className="typing" style={typography}>
              <RichEditor
                initialHtml={initial.mine}
                label="Your notes"
                placeholder="Start typing your notes…"
                onChange={(html, text) => save({ bodyHtml: html, body: text })}
                onActive={(editor, reason) => {
                  setMineEditor(editor);
                  if (reason === "focus") setActive("mine");
                }}
              />
            </div>
          </div>
        </section>

        <div
          className="divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels. Drag, or use the left and right arrow keys. Double-click for equal halves."
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(layout.split * 100)}
          tabIndex={0}
          title="Drag to resize. Double-click for equal halves."
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = true;
          }}
          onPointerMove={(e) => dragging.current && dragTo(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onDoubleClick={() => changeLayout({ split: 0.5 })}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") changeLayout({ split: clampSplit(layout.split - 0.05) });
            if (e.key === "ArrowRight") changeLayout({ split: clampSplit(layout.split + 0.05) });
          }}
        />

        <section ref={aiRef} className="panel ai" aria-label="AI summary">
          <div className="panel-inner">
            <div className="panel-head">
              <h2 className="panel-label">AI summary</h2>
              <button
                className="icon-btn quiet desktop-only"
                onClick={() => changeLayout({ aiOpen: false })}
                aria-label="Close AI summary"
                title="Close AI summary"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="typing" style={typography}>
              <RichEditor
                initialHtml={initial.ai}
                label="AI summary"
                placeholder="The AI summary of your source will appear here in step 5. It will always be a suggestion and will never change your notes on the left. Until then you can type and edit here yourself."
                onChange={(html, text) => save({ aiHtml: html, aiText: text })}
                onActive={(editor, reason) => {
                  setAiEditor(editor);
                  if (reason === "focus") setActive("ai");
                }}
              />
            </div>
          </div>
        </section>

        <aside className="source" aria-label="Source">
          <div className="panel-head">
            <h2 className="panel-label">Source</h2>
            <button
              className="icon-btn quiet desktop-only"
              onClick={() => changeLayout({ sourceOpen: false })}
              aria-label="Hide source"
              title="Hide source"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="placeholder">
            <p>Your uploaded lecture notes (PDF, Word, photos or pasted text) will live here.</p>
            <p>Open this tab to check something, then tuck it away. Hiding it never deletes it.</p>
            <p className="soon">Coming in step 4</p>
          </div>
        </aside>

        <button
          className={`rail${layout.sourceOpen ? " open" : ""}`}
          onClick={() => changeLayout({ sourceOpen: !layout.sourceOpen })}
          aria-expanded={layout.sourceOpen}
          aria-label={layout.sourceOpen ? "Hide source" : "Show source"}
          title={layout.sourceOpen ? "Hide source" : "Show source"}
        >
          <SourceIcon />
          <span>Source</span>
        </button>
      </div>
    </div>
  );
}
