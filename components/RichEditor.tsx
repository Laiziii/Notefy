"use client";

import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

export type { Editor };

/** Notes written before formatting existed are plain text; turn them into paragraphs. */
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}

/**
 * The typing area. It keeps its own content while you type and reports every
 * change through onChange, as formatted content plus plain text for search.
 */
export function RichEditor({
  initialHtml,
  label,
  placeholder,
  onChange,
  onActive,
}: {
  initialHtml: string;
  label: string;
  placeholder: string;
  onChange: (html: string, text: string) => void;
  /** Called when this editor is created and whenever it is clicked into, so the toolbar knows where to act. */
  onActive: (editor: Editor, reason: "ready" | "focus") => void;
}) {
  const handlers = useRef({ onChange, onActive });
  useEffect(() => {
    handlers.current = { onChange, onActive };
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      TextStyleKit,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onCreate: ({ editor }) => handlers.current.onActive(editor, "ready"),
    onFocus: ({ editor }) => handlers.current.onActive(editor, "focus"),
    onUpdate: ({ editor }) => {
      const text = editor.getText({ blockSeparator: "\n" });
      handlers.current.onChange(editor.isEmpty ? "" : editor.getHTML(), text);
    },
  });

  return <EditorContent editor={editor} className="editor" />;
}
