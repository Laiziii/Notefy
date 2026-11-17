"use client";

import { useEffect, useRef } from "react";

/** The note title. It wraps onto more lines instead of cutting off when the panel is narrow. */
export function TitleInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow to fit the text, and again whenever the panel changes width.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="note-title"
      rows={1}
      value={value}
      placeholder="Untitled"
      aria-label="Note title"
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        // Enter moves on to the notes instead of adding a line to the title.
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget.closest(".panel")?.querySelector(".prose") as HTMLElement | null)?.focus();
        }
      }}
    />
  );
}
