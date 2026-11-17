"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  COLOURS,
  DEFAULT_FONT_SIZE,
  FONT_GROUPS,
  FONT_SIZES,
  type Font,
  ensureFont,
  ensureFontPreviews,
  fontByName,
  fontFromStack,
  highlightColour,
  textColour,
} from "@/lib/fonts";
import type { Note, NotePatch } from "@/lib/store";
import { BulletsIcon, CaretIcon, HighlightIcon, NumbersIcon, RedoIcon, SpacingIcon, UndoIcon } from "./Icons";
import { Menu } from "./Menu";

const STYLES = [
  { id: "p", label: "Normal text" },
  { id: "h1", label: "Heading 1" },
  { id: "h2", label: "Heading 2" },
  { id: "h3", label: "Heading 3" },
] as const;

const SPACINGS = [
  { id: "single", label: "Single" },
  { id: "comfortable", label: "Comfortable" },
  { id: "double", label: "Double" },
] as const;

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * The one toolbar at the top of a note. It acts on whichever panel you last
 * clicked into (My notes or AI summary).
 *
 * Font, size and spacing: with text selected they change just that text;
 * with nothing selected they change the whole note.
 */
export function NoteToolbar({
  editor,
  editors,
  note,
  onNoteStyle,
}: {
  editor: Editor | null;
  editors: Editor[];
  note: Note;
  onNoteStyle: (patch: NotePatch) => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const mark = editor.getAttributes("textStyle");
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        bullets: editor.isActive("bulletList"),
        numbers: editor.isActive("orderedList"),
        style: editor.isActive("heading", { level: 1 })
          ? "h1"
          : editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p",
        fontFamily: (mark.fontFamily as string | null) ?? null,
        fontSize: (mark.fontSize as string | null) ?? null,
        color: (mark.color as string | null) ?? null,
        background: (mark.backgroundColor as string | null) ?? null,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
        hasSelection: !editor.state.selection.empty,
      };
    },
  });

  const off = !editor || !s;
  const run = (fn: (e: Editor) => void) => editor && fn(editor);

  const currentFont = fontFromStack(s?.fontFamily) ?? fontByName(note.font);
  const currentSize = s?.fontSize ? parseInt(s.fontSize, 10) : (note.fontSize ?? DEFAULT_FONT_SIZE);
  const currentSpacing = note.spacing ?? "comfortable";

  /** Removes a per-text setting everywhere, so a whole-note choice is not overridden by old selections. */
  function clearEverywhere(clear: (e: Editor) => void) {
    for (const e of editors) {
      const { from, to } = e.state.selection;
      const hadFocus = e.isFocused;
      e.chain().selectAll().run();
      clear(e);
      e.commands.setTextSelection({ from, to });
      if (hadFocus) e.commands.focus();
    }
  }

  function pickFont(font: Font | undefined) {
    ensureFont(font);
    if (editor && s?.hasSelection) {
      if (font) editor.chain().focus().setFontFamily(font.stack).run();
      else editor.chain().focus().unsetFontFamily().run();
      return;
    }
    clearEverywhere((e) => e.commands.unsetFontFamily());
    onNoteStyle({ font: font?.name });
  }

  function pickSize(size: number) {
    if (editor && s?.hasSelection) {
      editor.chain().focus().setFontSize(`${size}px`).run();
      return;
    }
    clearEverywhere((e) => e.commands.unsetFontSize());
    onNoteStyle({ fontSize: size === DEFAULT_FONT_SIZE ? undefined : size });
  }

  function pickStyle(id: (typeof STYLES)[number]["id"]) {
    run((e) => {
      if (id === "p") e.chain().focus().setParagraph().run();
      else e.chain().focus().setHeading({ level: Number(id[1]) as 1 | 2 | 3 }).run();
    });
  }

  return (
    // Keeping the mouse press from moving focus means your text selection survives a toolbar click.
    <div className="toolbar" role="toolbar" aria-label="Formatting" onMouseDown={(e) => e.preventDefault()}>
      <div className="toolbar-row">
        <button
          type="button"
          className="tb-btn"
          aria-label="Undo"
          title="Undo"
          disabled={off || !s.canUndo}
          onClick={() => run((e) => e.chain().focus().undo().run())}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="tb-btn"
          aria-label="Redo"
          title="Redo"
          disabled={off || !s.canRedo}
          onClick={() => run((e) => e.chain().focus().redo().run())}
        >
          <RedoIcon />
        </button>

        <span className="tb-sep" />

        <Menu
          label="Text style"
          className="tb-select"
          width={220}
          button={
            <>
              <span className="tb-value" style={{ width: 96 }}>
                {STYLES.find((x) => x.id === (s?.style ?? "p"))!.label}
              </span>
              <CaretIcon />
            </>
          }
        >
          {(close) =>
            STYLES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="menuitemradio"
                aria-checked={s?.style === x.id}
                className={`menu-item style-${x.id}`}
                onClick={() => {
                  pickStyle(x.id);
                  close();
                }}
              >
                {x.label}
              </button>
            ))
          }
        </Menu>

        <Menu
          label="Font"
          className="tb-select"
          width={280}
          onOpen={ensureFontPreviews}
          button={
            <>
              <span className="tb-value" style={{ width: 132, fontFamily: currentFont?.stack }}>
                {currentFont?.name ?? "Default font"}
              </span>
              <CaretIcon />
            </>
          }
        >
          {(close) => (
            <>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!currentFont}
                className="menu-item"
                onClick={() => {
                  pickFont(undefined);
                  close();
                }}
              >
                Default font
              </button>
              {FONT_GROUPS.map((group) => (
                <div key={group.label} role="group" aria-label={group.label}>
                  <div className="menu-label">{group.label}</div>
                  {group.fonts.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      role="menuitemradio"
                      aria-checked={currentFont?.name === font.name}
                      className="menu-item font-item"
                      style={{ fontFamily: font.stack }}
                      onClick={() => {
                        pickFont(font);
                        close();
                      }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </Menu>

        <Menu
          label="Font size"
          className="tb-select"
          width={120}
          button={
            <>
              <span className="tb-value" style={{ width: 22 }}>
                {currentSize}
              </span>
              <CaretIcon />
            </>
          }
        >
          {(close) =>
            FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="menuitemradio"
                aria-checked={currentSize === size}
                className="menu-item"
                onClick={() => {
                  pickSize(size);
                  close();
                }}
              >
                {size}
              </button>
            ))
          }
        </Menu>

        <span className="tb-sep" />

        <button
          type="button"
          className={`tb-btn tb-letter${s?.bold ? " on" : ""}`}
          aria-label="Bold"
          title="Bold"
          aria-pressed={!!s?.bold}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleBold().run())}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={`tb-btn tb-letter${s?.italic ? " on" : ""}`}
          aria-label="Italic"
          title="Italic"
          aria-pressed={!!s?.italic}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={`tb-btn tb-letter${s?.underline ? " on" : ""}`}
          aria-label="Underline"
          title="Underline"
          aria-pressed={!!s?.underline}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleUnderline().run())}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className={`tb-btn tb-letter${s?.strike ? " on" : ""}`}
          aria-label="Strikethrough"
          title="Strikethrough"
          aria-pressed={!!s?.strike}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleStrike().run())}
        >
          <s>S</s>
        </button>

        <span className="tb-sep" />

        <Menu
          label="Text colour"
          width={212}
          button={
            <span className="tb-letter tb-colour" style={{ borderBottomColor: s?.color ?? "var(--text)" }}>
              A
            </span>
          }
        >
          {(close) => (
            <div className="swatches">
              <div className="menu-label">Text colour</div>
              <button
                type="button"
                className="swatch-row"
                onClick={() => {
                  run((e) => e.chain().focus().unsetColor().run());
                  close();
                }}
              >
                <span aria-hidden="true" className="swatch text">A</span> Default
              </button>
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch-row"
                  aria-pressed={s?.color === textColour(c)}
                  onClick={() => {
                    run((e) => e.chain().focus().setColor(textColour(c)).run());
                    close();
                  }}
                >
                  <span aria-hidden="true" className="swatch text" style={{ color: textColour(c) }}>
                    A
                  </span>{" "}
                  {cap(c)}
                </button>
              ))}
            </div>
          )}
        </Menu>

        <Menu
          label="Highlight colour"
          width={212}
          button={
            <span className="tb-highlight" style={{ background: s?.background ?? "transparent" }}>
              <HighlightIcon />
            </span>
          }
        >
          {(close) => (
            <div className="swatches">
              <div className="menu-label">Highlight</div>
              <button
                type="button"
                className="swatch-row"
                onClick={() => {
                  run((e) => e.chain().focus().unsetBackgroundColor().run());
                  close();
                }}
              >
                <span className="swatch none" /> No highlight
              </button>
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch-row"
                  aria-pressed={s?.background === highlightColour(c)}
                  onClick={() => {
                    run((e) => e.chain().focus().setBackgroundColor(highlightColour(c)).run());
                    close();
                  }}
                >
                  <span className="swatch" style={{ background: highlightColour(c) }} /> {cap(c)}
                </button>
              ))}
            </div>
          )}
        </Menu>

        <span className="tb-sep" />

        <button
          type="button"
          className={`tb-btn${s?.bullets ? " on" : ""}`}
          aria-label="Bullet list"
          title="Bullet list"
          aria-pressed={!!s?.bullets}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
        >
          <BulletsIcon />
        </button>
        <button
          type="button"
          className={`tb-btn${s?.numbers ? " on" : ""}`}
          aria-label="Numbered list"
          title="Numbered list"
          aria-pressed={!!s?.numbers}
          disabled={off}
          onClick={() => run((e) => e.chain().focus().toggleOrderedList().run())}
        >
          <NumbersIcon />
        </button>

        <span className="tb-sep" />

        <Menu
          label="Line spacing"
          className="tb-select"
          width={190}
          button={
            <>
              <SpacingIcon />
              <span className="tb-value">{SPACINGS.find((x) => x.id === currentSpacing)!.label}</span>
              <CaretIcon />
            </>
          }
        >
          {(close) =>
            SPACINGS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="menuitemradio"
                aria-checked={currentSpacing === x.id}
                className="menu-item"
                onClick={() => {
                  onNoteStyle({ spacing: x.id === "comfortable" ? undefined : x.id });
                  close();
                }}
              >
                {x.label} spacing
              </button>
            ))
          }
        </Menu>
      </div>
    </div>
  );
}
