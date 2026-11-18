"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { PlusIcon, SearchIcon } from "@/components/Icons";
import { NewNotebookDialog } from "@/components/NewNotebookDialog";
import { HomeSkeleton } from "@/components/Skeletons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatWhen } from "@/lib/dates";
import { COLOURS } from "@/lib/fonts";
import { createNotebook, useReady, useStore } from "@/lib/store";

type Hit = { key: string; href: string; title: string; where: string; snippet: string };

function snippetAround(text: string, at: number, length: number) {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + length + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

/** Gives each notebook a steady colour from the palette, so they are easy to tell apart. */
function colourFor(id: string) {
  let sum = 0;
  for (const ch of id) sum = (sum * 31 + ch.charCodeAt(0)) % 9973;
  return `var(--c-${COLOURS[sum % COLOURS.length]})`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Home() {
  const { notebooks, topics, notes } = useStore();
  const ready = useReady();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  // This screen is kept alive in the background after you leave it. Make sure
  // the dialog never comes back open by itself when you return.
  useLayoutEffect(() => () => setCreating(false), []);

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
      const where = byId.get(note.notebookId)?.className || "Untitled notebook";
      const inTitle = note.title.toLowerCase().includes(q);
      const at = note.body.toLowerCase().indexOf(q);
      const aiAt = (note.aiText ?? "").toLowerCase().indexOf(q);
      if (!inTitle && at < 0 && aiAt < 0) continue;
      out.push({
        key: note.id,
        href: `/n/${note.notebookId}/${note.id}`,
        title: note.title || "Untitled note",
        where: at < 0 && aiAt >= 0 ? `${where} · AI summary` : where,
        snippet: at >= 0 ? snippetAround(note.body, at, q.length) : aiAt >= 0 ? snippetAround(note.aiText!, aiAt, q.length) : "",
      });
    }
    return out;
  }, [q, notebooks, notes]);

  return (
    <div className="page">
      <header className="topbar">
        <span className="wordmark">Notefy</span>
        <span className="spacer" />
        <button className="btn square" onClick={() => setCreating(true)} aria-label="New notebook" title="New notebook">
          <PlusIcon />
        </button>
        <AccountMenu />
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
          <>
            <h1 className="section-title">
              {hits.length ? plural(hits.length, "result") : "No results"} for “{query.trim()}”
            </h1>
            <ul className="results">
              {hits.map((h) => (
                <li key={h.key}>
                  <Link className="result" href={h.href}>
                    <span className="result-title">{h.title}</span>
                    <span className="meta">{h.where}</span>
                    {h.snippet && <span className="result-snippet">{h.snippet}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1 className="section-title">Your notebooks</h1>
            {!ready ? (
              <HomeSkeleton />
            ) : sorted.length ? (
              <ul className="cards">
                {sorted.map((nb) => {
                  const noteCount = notes.filter((n) => n.notebookId === nb.id).length;
                  const topicCount = topics.filter((t) => t.notebookId === nb.id).length;
                  const where = [nb.location, nb.time].filter(Boolean).join(" · ");
                  return (
                    <li key={nb.id}>
                      <Link className="card" href={`/n/${nb.id}`} style={{ "--tint": colourFor(nb.id) } as React.CSSProperties}>
                        <span className="card-title">{nb.className || "Untitled notebook"}</span>
                        <span className="card-prof">{nb.professor || "No professor added"}</span>
                        <span className="meta">{where || "No room or time added"}</span>
                        <span className="card-foot">
                          <span>
                            {plural(noteCount, "note")}
                            {topicCount ? ` · ${plural(topicCount, "topic")}` : ""}
                          </span>
                          <span>Last used {formatWhen(nb.updatedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty boxed">
                <p>No notebooks yet. Make one for each class you take.</p>
                <button className="btn" onClick={() => setCreating(true)}>
                  <PlusIcon /> Create your first notebook
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {creating && (
        <NewNotebookDialog
          onCancel={() => setCreating(false)}
          onCreate={(details, template) => {
            setCreating(false);
            router.push(`/n/${createNotebook(details, template)}`);
          }}
        />
      )}
    </div>
  );
}
