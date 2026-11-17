"use client";

import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("notefy:theme", next);
    } catch {}
  }
  return (
    <button className="icon-btn" onClick={toggle} aria-label="Switch between light and dark mode" title="Light / dark">
      <span className="only-light">
        <MoonIcon />
      </span>
      <span className="only-dark">
        <SunIcon />
      </span>
    </button>
  );
}
