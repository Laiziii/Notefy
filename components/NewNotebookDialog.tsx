"use client";

import { useState } from "react";
import { TEMPLATES, type NotebookDetails } from "@/lib/store";
import { Modal } from "./Dialog";

const EMPTY: NotebookDetails = { className: "", professor: "", location: "", time: "", email: "" };

/** Always starts empty: it is created fresh each time it opens. */
export function NewNotebookDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (details: NotebookDetails, templateId: string) => void;
  onCancel: () => void;
}) {
  const [details, setDetails] = useState(EMPTY);
  const [template, setTemplate] = useState("blank");
  const bind = (key: keyof NotebookDetails) => ({
    value: details[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDetails({ ...details, [key]: e.target.value }),
  });

  return (
    <Modal title="New notebook" onClose={onCancel}>
      <form
        className="dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ ...details, className: details.className.trim() || "Untitled notebook" }, template);
        }}
      >
        <label className="field">
          <span>Class name</span>
          <input autoFocus placeholder="e.g. Health Inspection" {...bind("className")} />
        </label>
        <label className="field">
          <span>Professor (optional)</span>
          <input placeholder="e.g. Dr. Okafor" {...bind("professor")} />
        </label>
        <div className="field-pair">
          <label className="field">
            <span>Room / location (optional)</span>
            <input placeholder="e.g. Room B214" {...bind("location")} />
          </label>
          <label className="field">
            <span>Class time (optional)</span>
            <input placeholder="e.g. Tue & Thu 10:00" {...bind("time")} />
          </label>
        </div>
        <label className="field">
          <span>Professor email (optional)</span>
          <input type="email" placeholder="e.g. name@university.edu" {...bind("email")} />
        </label>
        <fieldset className="templates">
          <legend>Start from</legend>
          {TEMPLATES.map((t) => (
            <label key={t.id} className={`template${template === t.id ? " selected" : ""}`}>
              <input type="radio" name="template" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id)} />
              <span className="template-name">{t.name}</span>
              <span className="template-hint">{t.hint}</span>
            </label>
          ))}
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" type="submit">
            Create notebook
          </button>
        </div>
      </form>
    </Modal>
  );
}
