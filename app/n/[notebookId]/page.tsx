"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useLayoutEffect, useState } from "react";
import { ConfirmDialog, PromptDialog } from "@/components/Dialog";
import { BackIcon, ChevronIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { NotebookSkeleton } from "@/components/Skeletons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatWhen } from "@/lib/dates";
import {
  type Note,
  type Topic,
  createNote,
  createTopic,
  deleteNote,
  deleteNotebook,
  deleteTopic,
  updateNotebook,
  updateTopic,
  useReady,
  useSaving,
  useStore,
} from "@/lib/store";

export default function NotebookPage() {
  return (
    <Suspense fallback={<NotebookSkeleton />}>
      <NotebookScreen />
    </Suspense>
  );
}

type Ask =
  | { kind: "new-topic" }
  | { kind: "rename-topic"; topic: Topic }
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; action: () => void };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const noteName = (note: Note) => note.title || "Untitled note";

function NoteRows({ notes, notebookId, onDelete }: { notes: Note[]; notebookId: string; onDelete: (note: Note) => void }) {
  return (
    <ul className="note-rows">
      {notes.map((note) => (
        <li key={note.id} className="note-row">
          <Link className="note-link" href={`/n/${notebookId}/${note.id}`}>
            <span className="note-name">{noteName(note)}</span>
            {note.body && <span className="note-preview">{note.body.slice(0, 160)}</span>}
          </Link>
          <span className="meta note-date">Edited {formatWhen(note.updatedAt)}</span>
          <button className="icon-btn quiet" aria-label={`Delete note ${noteName(note)}`} title="Delete note" onClick={() => onDelete(note)}>
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

function NotebookScreen() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();
  const ready = useReady();
  const saved = !useSaving();
  const store = useStore();
  const [ask, setAsk] = useState<Ask | null>(null);
  // Never come back to this screen with a dialog still open.
  useLayoutEffect(() => () => setAsk(null), []);

  const notebook = store.notebooks.find((n) => n.id === notebookId);

  if (!ready) return <NotebookSkeleton />;
  if (!notebook) {
    return (
      <div className="page">
        <main className="column">
          <div className="empty">
            <p>This notebook does not exist on this device.</p>
            <Link className="btn" href="/">
              Back to notebooks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const topics = store.topics.filter((t) => t.notebookId === notebookId).sort((a, b) => a.createdAt - b.createdAt);
  const notes = store.notes.filter((n) => n.notebookId === notebookId).sort((a, b) => b.updatedAt - a.updatedAt);
  const loose = notes.filter((n) => !n.topicId);
  const notebookName = notebook.className || "Untitled notebook";

  const newNote = (topicId: string | null) => router.push(`/n/${notebookId}/${createNote(notebookId, topicId)}`);
  const field = (key: "className" | "professor" | "location" | "time" | "email") => ({
    value: notebook[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateNotebook(notebookId, { [key]: e.target.value }),
  });

  const confirmDeleteNote = (note: Note) =>
    setAsk({
      kind: "confirm",
      title: "Delete this note?",
      message: `"${noteName(note)}" will be deleted for good. This cannot be undone.`,
      confirmLabel: "Delete note",
      action: () => deleteNote(note.id),
    });

  return (
    <div className="page">
      <header className="topbar">
        <Link className="back-link" href="/" aria-label="Back to notebooks">
          <BackIcon />
          <span>Notebooks</span>
        </Link>
        <span className="spacer" />
        <span className="saved" aria-live="polite">
          {saved ? "Saved" : "Saving…"}
        </span>
        <button
          className="icon-btn"
          aria-label="Delete notebook"
          title="Delete notebook"
          onClick={() =>
            setAsk({
              kind: "confirm",
              title: "Delete this notebook?",
              message: `"${notebookName}" and ${notes.length ? `all ${plural(notes.length, "note")} inside it` : "everything inside it"} will be deleted for good. This cannot be undone.`,
              confirmLabel: "Delete notebook",
              action: () => {
                deleteNotebook(notebookId);
                router.push("/");
              },
            })
          }
        >
          <TrashIcon />
        </button>
        <ThemeToggle />
      </header>

      <main className="column">
        <section className="class-info" aria-label="Class details">
          <label className="cf cf-name">
            <span>Class name</span>
            <input placeholder="Add the class name" {...field("className")} />
          </label>
          <label className="cf cf-prof">
            <span>Professor</span>
            <input placeholder="Add professor" {...field("professor")} />
          </label>
          <div className="cf-pair">
            <label className="cf">
              <span>Room / location</span>
              <input placeholder="Add room" {...field("location")} />
            </label>
            <label className="cf">
              <span>Class time</span>
              <input placeholder="Add class time" {...field("time")} />
            </label>
          </div>
          <label className="cf cf-email">
            <span>Professor email</span>
            <input type="email" placeholder="Add email" {...field("email")} />
          </label>
        </section>

        <div className="actions">
          <button className="btn" onClick={() => newNote(null)}>
            <PlusIcon /> New note
          </button>
          <button className="btn" onClick={() => setAsk({ kind: "new-topic" })}>
            <PlusIcon /> New topic
          </button>
        </div>

        {!notes.length && !topics.length && (
          <div className="empty boxed">
            <p>Nothing here yet. Start a note, or add a topic (like Lectures or Labs) to group your notes.</p>
          </div>
        )}

        {loose.length > 0 && (
          <section className="topic">
            {topics.length > 0 && (
              <div className="topic-head plain">
                <span className="topic-name">Notes without a topic</span>
                <span className="meta">{plural(loose.length, "note")}</span>
              </div>
            )}
            <NoteRows notes={loose} notebookId={notebookId} onDelete={confirmDeleteNote} />
          </section>
        )}

        {topics.map((topic) => {
          const inside = notes.filter((n) => n.topicId === topic.id);
          const name = topic.name || "Untitled topic";
          const open = !topic.collapsed;
          return (
            <section key={topic.id} className="topic">
              <div className="topic-head">
                <button
                  className={`topic-toggle${open ? " open" : ""}`}
                  aria-expanded={open}
                  title={open ? "Collapse topic" : "Open topic"}
                  onClick={() => updateTopic(topic.id, { collapsed: open })}
                >
                  <ChevronIcon />
                  <span className="topic-name">{name}</span>
                  <span className="meta">
                    {plural(inside.length, "note")}
                    {inside.length ? ` · edited ${formatWhen(inside[0].updatedAt)}` : ` · added ${formatWhen(topic.createdAt)}`}
                  </span>
                </button>
                <button className="icon-btn quiet" aria-label={`New note in ${name}`} title="New note in this topic" onClick={() => newNote(topic.id)}>
                  <PlusIcon />
                </button>
                <button
                  className="icon-btn quiet"
                  aria-label={`Rename topic ${name}`}
                  title="Rename topic"
                  onClick={() => setAsk({ kind: "rename-topic", topic })}
                >
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn quiet push"
                  aria-label={`Delete topic ${name}`}
                  title="Delete topic"
                  onClick={() =>
                    setAsk({
                      kind: "confirm",
                      title: "Delete this topic?",
                      message: inside.length
                        ? `"${name}" and the ${plural(inside.length, "note")} inside it will be deleted for good. This cannot be undone.`
                        : `"${name}" will be deleted. It has no notes in it.`,
                      confirmLabel: "Delete topic",
                      action: () => deleteTopic(topic.id),
                    })
                  }
                >
                  <TrashIcon />
                </button>
              </div>
              {open &&
                (inside.length ? (
                  <NoteRows notes={inside} notebookId={notebookId} onDelete={confirmDeleteNote} />
                ) : (
                  <p className="topic-empty">
                    No notes in this topic yet.{" "}
                    <button className="link" onClick={() => newNote(topic.id)}>
                      Add one
                    </button>
                  </p>
                ))}
            </section>
          );
        })}
      </main>

      {ask?.kind === "new-topic" && (
        <PromptDialog
          title="New topic"
          label="Topic name"
          placeholder="e.g. Lectures, Labs, Exam prep"
          submitLabel="Add topic"
          onCancel={() => setAsk(null)}
          onSubmit={(name) => {
            createTopic(notebookId, name || "New topic");
            setAsk(null);
          }}
        />
      )}
      {ask?.kind === "rename-topic" && (
        <PromptDialog
          title="Rename topic"
          label="Topic name"
          initial={ask.topic.name}
          submitLabel="Save name"
          onCancel={() => setAsk(null)}
          onSubmit={(name) => {
            if (name) updateTopic(ask.topic.id, { name });
            setAsk(null);
          }}
        />
      )}
      {ask?.kind === "confirm" && (
        <ConfirmDialog
          title={ask.title}
          message={ask.message}
          confirmLabel={ask.confirmLabel}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            setAsk(null);
            ask.action();
          }}
        />
      )}
    </div>
  );
}
