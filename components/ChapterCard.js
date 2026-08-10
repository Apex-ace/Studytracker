"use client";

import { useEffect, useMemo, useState } from "react";
import { chapterMetrics, WEAKNESS_OPTIONS } from "@/lib/performance";
import { saveChapterProgress } from "@/lib/firestore";
import { pp, statusTone } from "@/lib/format";

const emptyRow = {
  firstCutPlanned: "",
  firstCutActual: "",
  test1: "",
  rev2Planned: "",
  rev2Actual: "",
  test2: "",
  rev3Planned: "",
  rev3Actual: "",
  test3: "",
  mainWeakness: "",
  actionRequired: "",
};

function cleanValues(values) {
  const next = { ...values };
  ["test1", "test2", "test3"].forEach((key) => {
    if (next[key] === "") next[key] = null;
    else next[key] = Math.max(0, Math.min(100, Number(next[key])));
  });
  return next;
}

export default function ChapterCard({ uid, chapter, subjectSlug, saved, settings }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyRow, ...(saved || {}) });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({ ...emptyRow, ...(saved || {}) });
  }, [saved]);

  const metrics = useMemo(() => chapterMetrics(form, settings), [form, settings]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await saveChapterProgress(uid, chapter, subjectSlug, cleanValues(form));
      setMessage("Saved");
    } catch (error) {
      console.error(error);
      setMessage("Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`chapter-card ${open ? "open" : ""}`}>
      <button className="chapter-summary" onClick={() => setOpen((value) => !value)}>
        <div className="chapter-copy">
          <small>{chapter.section || chapter.group || "Chapter"}</small>
          <strong>{chapter.title}</strong>
          <div className="chapter-meta">
            <span className={`pill ${statusTone(metrics.readiness)}`}>{metrics.readiness}</span>
            {metrics.maxDelay > 0 && <span className="delay-chip">+{metrics.maxDelay}d delay</span>}
          </div>
        </div>
        <div className="chapter-score-wrap">
          <strong>{metrics.latest === null ? "—" : `${Math.round(metrics.latest)}%`}</strong>
          <small>{metrics.trend === null ? `Target ${chapter.target}%` : pp(metrics.trend)}</small>
          <span className="chevron">⌄</span>
        </div>
      </button>

      {open && (
        <div className="chapter-body">
          <div className="revision-grid">
            <div className="revision-block">
              <div className="revision-title"><span>1</span><strong>First cut</strong></div>
              <label>Planned<input type="date" value={form.firstCutPlanned || ""} onChange={(e) => set("firstCutPlanned", e.target.value)} /></label>
              <label>Actual<input type="date" value={form.firstCutActual || ""} onChange={(e) => set("firstCutActual", e.target.value)} /></label>
              <label>Test 1 %<input inputMode="decimal" type="number" min="0" max="100" value={form.test1 ?? ""} onChange={(e) => set("test1", e.target.value)} placeholder="0–100" /></label>
            </div>
            <div className="revision-block">
              <div className="revision-title"><span>2</span><strong>Revision 2</strong></div>
              <label>Planned<input type="date" value={form.rev2Planned || ""} onChange={(e) => set("rev2Planned", e.target.value)} /></label>
              <label>Actual<input type="date" value={form.rev2Actual || ""} onChange={(e) => set("rev2Actual", e.target.value)} /></label>
              <label>Test 2 %<input inputMode="decimal" type="number" min="0" max="100" value={form.test2 ?? ""} onChange={(e) => set("test2", e.target.value)} placeholder="0–100" /></label>
            </div>
            <div className="revision-block">
              <div className="revision-title"><span>3</span><strong>Revision 3</strong></div>
              <label>Planned<input type="date" value={form.rev3Planned || ""} onChange={(e) => set("rev3Planned", e.target.value)} /></label>
              <label>Actual<input type="date" value={form.rev3Actual || ""} onChange={(e) => set("rev3Actual", e.target.value)} /></label>
              <label>Test 3 %<input inputMode="decimal" type="number" min="0" max="100" value={form.test3 ?? ""} onChange={(e) => set("test3", e.target.value)} placeholder="0–100" /></label>
            </div>
          </div>

          <div className="chapter-notes-grid">
            <label>Main weakness
              <select value={form.mainWeakness || ""} onChange={(e) => set("mainWeakness", e.target.value)}>
                <option value="">Select weakness</option>
                {WEAKNESS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Corrective action
              <textarea rows="3" value={form.actionRequired || ""} onChange={(e) => set("actionRequired", e.target.value)} placeholder="Write one specific action…" />
            </label>
          </div>

          <div className="chapter-save-bar">
            <div><strong>{metrics.readiness}</strong><small>Latest {metrics.latest === null ? "—" : `${Math.round(metrics.latest)}%`} • Max delay {metrics.maxDelay} days</small></div>
            <div className="save-actions">{message && <span className={message === "Saved" ? "save-ok" : "save-error"}>{message}</span>}<button className="primary-btn compact" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save progress"}</button></div>
          </div>
        </div>
      )}
    </article>
  );
}
