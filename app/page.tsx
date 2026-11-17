"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CloseIcon, PlusIcon, SearchIcon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TEMPLATES, createNotebook, useReady, useStore } from "@/lib/store";

type Hit = { key: string; href: string; title: string; where: string; snippet: string };

function snippetAround(text: string, at: number, length: number) {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + length + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

export default function Home() {
  const { notebooks, notes } = useStore();
  const ready = useReady();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");

  const sorted = useMemo(() => [...notebooks].sort((a, b) => b.updatedAt - a.updatedAt), [notebooks]);

  const q = query.trim().toLowerCase();
  const hits = useMemo<Hit[]>(() => {
    if (!q) return [];
    const out: Hit[] = [];
    const byId = new Map(notebooks.map((n) => [n.id, n]));
    for (const nb of notebooks) {
      const fields = [nb.className, nb.professor, nb.location, nb.time, nb.email];
      const match = fields.find((f) => f.toLowerCase().includes(q));
      if (match !== undefined) {
        out.push({
          key: nb.id,
          href: `/n/${nb.id}`,
          title: nb.className || "Untitled notebook",
          where: "Notebook",
          snippet: match === nb.className ? "" : match,
        });
      }
    }
    for (const note of notes) {
      const inTitle = note.title.toLowerCase().includes(q);
      const at = note.body.toLowerCase().indexOf(q);
      if (!inTitle && at < 0) continue;
      out.push({
        key: note.id,
        href: `/n/${note.notebookId}/${note.id}`,
        title: note.title || "Untitled note",
        where: byId.get(note.notebookId)?.className || "Untitled notebook",
        snippet: at >= 0 ? snippetAround(note.body, at, q.length) : "",
      });
    }
    return out;
  }, [q, notebooks, notes]);

  function closeDialog() {
    setCreating(false);
    setName("");
    setTemplate("blank");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = createNotebook(name || "Untitled notebook", template);
    router.push(`/n/${id}`);
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="wordmark">Notefy</span>
        <span className="spacer" />
        <button className="icon-btn" onClick={() => setCreating(true)} aria-label="New notebook" title="New notebook">
          <PlusIcon />
        </button>
        <ThemeToggle />
      </header>

      <main className="column">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search your notebooks and notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your notebooks and notes"
          />
        </label>

        {q ? (
          hits.length ? (
            <ul className="list">
              {hits.map((h) => (
                <li key={h.key}>
                  <Link className="row" href={h.href}>
                    <span className="row-title">{h.title}</span>
                    <span className="row-sub">{h.where}</span>
                    {h.snippet && <span className="row-snippet">{h.snippet}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing matches “{query.trim()}”.</p>
          )
        ) : !ready ? null : sorted.length ? (
          <ul className="list">
            {sorted.map((nb) => {
              const count = notes.filter((n) => n.notebookId === nb.id).length;
              const sub = [nb.professor, nb.time].filter(Boolean).join(" · ");
              return (
                <li key={nb.id}>
                  <Link className="row" href={`/n/${nb.id}`}>
                    <span className="row-title">{nb.className || "Untitled notebook"}</span>
                    <span className="row-sub">
                      {sub ? `${sub} · ` : ""}
                      {count} {count === 1 ? "note" : "notes"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty">
            <p>No notebooks yet.</p>
            <button className="btn" onClick={() => setCreating(true)}>
              Create your first notebook
            </button>
          </div>
        )}
      </main>

      {creating && (
        <div className="scrim" onClick={closeDialog}>
          <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()} aria-label="New notebook">
            <div className="dialog-head">
              <h2>New notebook</h2>
              <button type="button" className="icon-btn" onClick={closeDialog} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <label className="field">
              <span>Class name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Health Inspection"
              />
            </label>
            <fieldset className="templates">
              <legend>Start from</legend>
              {TEMPLATES.map((t) => (
                <label key={t.id} className={`template${template === t.id ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                  />
                  <span className="template-name">{t.name}</span>
                  <span className="template-hint">{t.hint}</span>
                </label>
              ))}
            </fieldset>
            <button className="btn primary" type="submit">
              Create notebook
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
