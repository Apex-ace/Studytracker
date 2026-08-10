"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { SUBJECT_ORDER, SUBJECTS } from "@/lib/catalog";
import { dashboardMetrics, DEFAULT_SETTINGS } from "@/lib/performance";
import { pct, statusTone } from "@/lib/format";
import { saveSettings, watchAllChapterProgress, watchSettings, watchUsers } from "@/lib/firestore";

const subjects = SUBJECT_ORDER.map((slug) => SUBJECTS[slug]);

function AdminContent() {
  const [users, setUsers] = useState([]);
  const [allProgress, setAllProgress] = useState({});
  const [settingsRemote, setSettingsRemote] = useState(null);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const stop1 = watchUsers(setUsers);
    const stop2 = watchAllChapterProgress(setAllProgress);
    const stop3 = watchSettings(setSettingsRemote);
    return () => { stop1(); stop2(); stop3(); };
  }, []);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(settingsRemote || {}) }), [settingsRemote]);
  const students = useMemo(() => users.filter((user) => user.role !== "admin"), [users]);

  const rows = useMemo(() => students.map((student) => ({
    student,
    metrics: dashboardMetrics(subjects, allProgress[student.id] || {}, settings),
  })), [students, allProgress, settings]);

  const filtered = rows.filter(({ student }) => {
    const q = search.trim().toLowerCase();
    return !q || `${student.name || ""} ${student.email || ""}`.toLowerCase().includes(q);
  });

  const activeWithData = rows.filter((row) => row.metrics.overallLatest > 0);
  const average = activeWithData.length
    ? activeWithData.reduce((sum, row) => sum + row.metrics.overallLatest, 0) / activeWithData.length
    : 0;
  const totalWeak = rows.reduce((sum, row) => sum + row.metrics.weak, 0);
  const readyStudents = rows.filter((row) => row.metrics.boardReadyPercent >= 75).length;

  async function updateSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    const form = new FormData(event.currentTarget);
    try {
      await saveSettings({
        defaultTarget: Number(form.get("defaultTarget")),
        boardReadyThreshold: Number(form.get("boardReadyThreshold")),
        masteredThreshold: Number(form.get("masteredThreshold")),
        goodThreshold: Number(form.get("goodThreshold")),
        weakThreshold: Number(form.get("weakThreshold")),
        delayWarningDays: Number(form.get("delayWarningDays")),
      });
      setShowSettings(false);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <AppShell
      admin
      title="Student progress"
      subtitle="Live overview — updates as students save chapter progress."
      actions={<div className="live-actions"><span className="live-pill"><i />Live</span><button className="secondary-btn compact" onClick={() => setShowSettings((v) => !v)}>Settings</button></div>}
    >
      <section className="stats-grid four">
        <StatCard label="Students" value={students.length} helper="Registered accounts" />
        <StatCard label="Average latest" value={pct(average)} helper="Students with score data" tone="success" />
        <StatCard label="Board-ready students" value={readyStudents} helper="≥75% tracked areas ready" tone="purple" />
        <StatCard label="Weak areas" value={totalWeak} helper="Across all students" tone={totalWeak ? "danger" : "success"} />
      </section>

      {showSettings && (
        <section className="panel-card settings-panel">
          <div className="section-heading"><div><p className="eyebrow">Excel thresholds</p><h2>Performance settings</h2></div></div>
          <form className="form-grid six" onSubmit={updateSettings}>
            <label>Chapter target %<input name="defaultTarget" type="number" min="0" max="100" defaultValue={settings.defaultTarget} /></label>
            <label>Board ready %<input name="boardReadyThreshold" type="number" min="0" max="100" defaultValue={settings.boardReadyThreshold} /></label>
            <label>Mastered %<input name="masteredThreshold" type="number" min="0" max="100" defaultValue={settings.masteredThreshold} /></label>
            <label>Good %<input name="goodThreshold" type="number" min="0" max="100" defaultValue={settings.goodThreshold} /></label>
            <label>Weak below %<input name="weakThreshold" type="number" min="0" max="100" defaultValue={settings.weakThreshold} /></label>
            <label>Delay warning days<input name="delayWarningDays" type="number" min="0" defaultValue={settings.delayWarningDays} /></label>
            <button className="primary-btn compact" disabled={savingSettings}>{savingSettings ? "Saving…" : "Save settings"}</button>
          </form>
        </section>
      )}

      <section className="panel-card">
        <div className="admin-list-header">
          <div><p className="eyebrow">All students</p><h2>Preparation overview</h2></div>
          <input className="search-input admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" />
        </div>

        <div className="admin-user-list">
          {filtered.map(({ student, metrics }) => {
            const status = metrics.overallLatest === 0 ? "No Data" : metrics.overallLatest >= 90 ? "Strong" : metrics.overallLatest >= 80 ? "Good" : metrics.overallLatest >= 70 ? "Needs Revision" : "Attention";
            return (
              <Link href={`/admin/users/${student.id}`} className="admin-user-row" key={student.id}>
                <div className="avatar large">{String(student.name || student.email || "S").slice(0, 1).toUpperCase()}</div>
                <div className="admin-user-main">
                  <div className="admin-user-title"><strong>{student.name || "Student"}</strong><span className={`pill ${statusTone(status)}`}>{status}</span></div>
                  <small>{student.email}</small>
                  <div className="mini-progress"><span style={{ width: `${Math.min(100, metrics.overallLatest)}%` }} /></div>
                </div>
                <div className="admin-mini-metric"><span>Latest</span><strong>{pct(metrics.overallLatest)}</strong></div>
                <div className="admin-mini-metric"><span>Ready</span><strong>{pct(metrics.boardReadyPercent)}</strong></div>
                <div className="admin-mini-metric"><span>First cut</span><strong>{pct(metrics.firstCutPercent)}</strong></div>
                <div className="admin-mini-metric weak"><span>Weak</span><strong>{metrics.weak}</strong></div>
                <span className="row-arrow">→</span>
              </Link>
            );
          })}
          {!filtered.length && <div className="empty-state"><strong>No students found.</strong><p>Students appear here after they create an account.</p></div>}
        </div>
      </section>
    </AppShell>
  );
}

export default function AdminPage() {
  return <RequireAuth admin><AdminContent /></RequireAuth>;
}
