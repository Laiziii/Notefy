"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A toolbar button that opens a small menu underneath it. The menu is placed
 * with fixed positioning so it is never cut off by the scrolling toolbar.
 */
export function Menu({
  label,
  button,
  className = "",
  width = 220,
  onOpen,
  children,
}: {
  label: string;
  button: ReactNode;
  className?: string;
  width?: number;
  onOpen?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      const w = Math.min(width, window.innerWidth - 16);
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
        top: r.bottom + 6,
        maxHeight: Math.max(160, window.innerHeight - r.bottom - 20),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`tb-btn ${className}${open ? " on" : ""}`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((o) => !o);
        }}
      >
        {button}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className="menu"
          role="menu"
          aria-label={label}
          style={{ left: pos.left, top: pos.top, maxHeight: pos.maxHeight, width: Math.min(width, window.innerWidth - 16) }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </>
  );
}
