"use client";

import { useMemo, useState } from "react";
import { addMockTest } from "@/lib/firestore";
import { mockTestMetrics } from "@/lib/performance";
import { pct } from "@/lib/format";

const initial = {
  date: "",
  subject: "Mathematics",
  paperSource: "",
  marksObtained: "",
  totalMarks: "80",
  target: "90",
  timeTaken: "",
  unattemptedMarks: "0",
  carelessLoss: "0",
  conceptLoss: "0",
  timeMgmtLoss: "0",
  otherLoss: "0",
  mainLearning: "",
  nextAction: "",
};

export default function MockTestForm({ uid, settings, onDone }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const metrics = useMemo(() => mockTestMetrics(form, settings), [form, settings]);

  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const numericKeys = ["marksObtained","totalMarks","target","timeTaken","unattemptedMarks","carelessLoss","conceptLoss","timeMgmtLoss","otherLoss"];
      const values = { ...form };
      numericKeys.forEach((key) => { values[key] = values[key] === "" ? null : Number(values[key]); });
      await addMockTest(uid, values);
      setForm({ ...initial, target: String(settings.defaultTarget) });
      onDone?.();
    } finally { setSaving(false); }
  }

  return (
    <form className="mock-form" onSubmit={submit}>
      <div className="form-grid three">
        <label>Date<input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label>Subject<select value={form.subject} onChange={(e) => set("subject", e.target.value)}><option>Mathematics</option><option>Science</option><option>Social Studies</option><option>English</option></select></label>
        <label>Paper / source<input required value={form.paperSource} onChange={(e) => set("paperSource", e.target.value)} placeholder="Sample Paper 1" /></label>
      </div>
      <div className="form-grid four">
        <label>Marks obtained<input type="number" min="0" required value={form.marksObtained} onChange={(e) => set("marksObtained", e.target.value)} /></label>
        <label>Total marks<input type="number" min="1" required value={form.totalMarks} onChange={(e) => set("totalMarks", e.target.value)} /></label>
        <label>Target %<input type="number" min="0" max="100" value={form.target} onChange={(e) => set("target", e.target.value)} /></label>
        <label>Time taken (min)<input type="number" min="0" value={form.timeTaken} onChange={(e) => set("timeTaken", e.target.value)} /></label>
      </div>
      <div className="loss-box">
        <div className="section-heading mini"><div><p className="eyebrow">Marks lost</p><h3>Where did the marks go?</h3></div><strong>{metrics.totalMarksLost} marks</strong></div>
        <div className="form-grid five">
          <label>Unattempted<input type="number" min="0" value={form.unattemptedMarks} onChange={(e) => set("unattemptedMarks", e.target.value)} /></label>
          <label>Careless<input type="number" min="0" value={form.carelessLoss} onChange={(e) => set("carelessLoss", e.target.value)} /></label>
          <label>Concept<input type="number" min="0" value={form.conceptLoss} onChange={(e) => set("conceptLoss", e.target.value)} /></label>
          <label>Time mgmt<input type="number" min="0" value={form.timeMgmtLoss} onChange={(e) => set("timeMgmtLoss", e.target.value)} /></label>
          <label>Other<input type="number" min="0" value={form.otherLoss} onChange={(e) => set("otherLoss", e.target.value)} /></label>
        </div>
      </div>
      <div className="form-grid two">
        <label>Main learning<textarea rows="3" value={form.mainLearning} onChange={(e) => set("mainLearning", e.target.value)} placeholder="What did this paper expose?" /></label>
        <label>Next action<textarea rows="3" value={form.nextAction} onChange={(e) => set("nextAction", e.target.value)} placeholder="Specific correction for next paper" /></label>
      </div>
      <div className="mock-preview"><div><span>Score</span><strong>{metrics.scorePercent === null ? "—" : pct(metrics.scorePercent, 1)}</strong></div><div><span>Gap</span><strong>{metrics.gap === null ? "—" : `${metrics.gap > 0 ? "+" : ""}${metrics.gap.toFixed(1)} pp`}</strong></div><div><span>Execution potential</span><strong>{metrics.executionPotential === null ? "—" : pct(metrics.executionPotential, 1)}</strong></div><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save mock test"}</button></div>
    </form>
  );
}
