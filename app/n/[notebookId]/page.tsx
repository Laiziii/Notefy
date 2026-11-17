"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BackIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  type Note,
  createNote,
  createTopic,
  deleteNote,
  deleteNotebook,
  deleteTopic,
  renameTopic,
  updateNotebook,
  useReady,
  useStore,
} from "@/lib/store";

function NoteRows({ notes, notebookId }: { notes: Note[]; notebookId: string }) {
  if (!notes.length) return null;
  return (
    <ul className="list tight">
      {notes.map((note) => (
        <li key={note.id} className="row-wrap">
          <Link className="row" href={`/n/${notebookId}/${note.id}`}>
            <span className="row-title small">{note.title || "Untitled note"}</span>
            {note.body && <span className="row-snippet one-line">{note.body.slice(0, 140)}</span>}
          </Link>
          <button
            className="icon-btn quiet"
            aria-label={`Delete note ${note.title || "Untitled note"}`}
            title="Delete note"
            onClick={() => {
              if (confirm(`Delete "${note.title || "Untitled note"}"? This cannot be undone.`)) deleteNote(note.id);
            }}
          >
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();
  const ready = useReady();
  const store = useStore();
  const notebook = store.notebooks.find((n) => n.id === notebookId);

  if (!ready) return <div className="page" />;
  if (!notebook) {
    return (
      <div className="page">
        <main className="column">
          <p className="empty">This notebook does not exist on this device.</p>
          <Link className="btn" href="/">
            Back to notebooks
          </Link>
        </main>
      </div>
    );
  }

  const topics = store.topics.filter((t) => t.notebookId === notebookId).sort((a, b) => a.createdAt - b.createdAt);
  const notes = store.notes.filter((n) => n.notebookId === notebookId).sort((a, b) => b.updatedAt - a.updatedAt);
  const loose = notes.filter((n) => !n.topicId);

  const newNote = (topicId: string | null) => router.push(`/n/${notebookId}/${createNote(notebookId, topicId)}`);
  const field = (key: "className" | "professor" | "location" | "time" | "email") => ({
    value: notebook[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateNotebook(notebookId, { [key]: e.target.value }),
  });

  return (
    <div className="page">
      <header className="topbar">
        <Link className="icon-btn" href="/" aria-label="Back to notebooks" title="Back to notebooks">
          <BackIcon />
        </Link>
        <span className="spacer" />
        <button
          className="icon-btn"
          aria-label="Delete notebook"
          title="Delete notebook"
          onClick={() => {
            if (confirm(`Delete "${notebook.className || "Untitled notebook"}" and all its notes? This cannot be undone.`)) {
              deleteNotebook(notebookId);
              router.push("/");
            }
          }}
        >
          <TrashIcon />
        </button>
        <ThemeToggle />
      </header>

      <main className="column">
        <section className="class-info">
          <input className="class-name" placeholder="Class name" aria-label="Class name" {...field("className")} />
          <input className="class-prof" placeholder="Professor" aria-label="Professor" {...field("professor")} />
          <div className="class-where">
            <input placeholder="Room / location" aria-label="Room or location" {...field("location")} />
            <input placeholder="Class time" aria-label="Class time" {...field("time")} />
          </div>
          <input
            className="class-email"
            type="email"
            placeholder="Professor email"
            aria-label="Professor email"
            {...field("email")}
          />
        </section>

        <div className="actions">
          <button className="btn primary" onClick={() => newNote(null)}>
            <PlusIcon /> New note
          </button>
          <button
            className="btn"
            onClick={() => {
              const id = createTopic(notebookId, "");
              requestAnimationFrame(() => document.getElementById(`topic-${id}`)?.focus());
            }}
          >
            <PlusIcon /> New topic
          </button>
        </div>

        {!notes.length && !topics.length && (
          <p className="empty">Nothing here yet. Start a note, or add a topic to group your notes.</p>
        )}

        <NoteRows notes={loose} notebookId={notebookId} />

        {topics.map((topic) => (
          <section key={topic.id} className="topic">
            <div className="topic-head">
              <input
                id={`topic-${topic.id}`}
                className="topic-name"
                value={topic.name}
                placeholder="Topic name"
                aria-label="Topic name"
                onChange={(e) => renameTopic(topic.id, e.target.value)}
              />
              <button
                className="icon-btn quiet"
                aria-label={`New note in ${topic.name || "this topic"}`}
                title="New note in this topic"
                onClick={() => newNote(topic.id)}
              >
                <PlusIcon />
              </button>
              <button
                className="icon-btn quiet"
                aria-label={`Delete topic ${topic.name || ""}`}
                title="Delete topic"
                onClick={() => {
                  const inside = notes.filter((n) => n.topicId === topic.id).length;
                  const warn = inside ? ` and the ${inside} ${inside === 1 ? "note" : "notes"} inside it` : "";
                  if (confirm(`Delete the topic "${topic.name || "Untitled"}"${warn}?`)) deleteTopic(topic.id);
                }}
              >
                <TrashIcon />
              </button>
            </div>
            <NoteRows notes={notes.filter((n) => n.topicId === topic.id)} notebookId={notebookId} />
          </section>
        ))}
      </main>
    </div>
  );
}
