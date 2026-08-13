"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { SUBJECT_ORDER, SUBJECTS } from "@/lib/catalog";
import { DEFAULT_SETTINGS, dashboardMetrics, chapterMetrics } from "@/lib/performance";
import { getUserProfile, watchChapterProgress, watchSettings, watchStudyActivities, watchVocabulary } from "@/lib/firestore";
import { pct, statusTone } from "@/lib/format";

const subjects = SUBJECT_ORDER.map((slug) => SUBJECTS[slug]);

function UserProgressContent() {
  const params = useParams();
  const uid = params.uid;
  const [student, setStudent] = useState(null);
  const [progress, setProgress] = useState({});
  const [settingsRemote, setSettingsRemote] = useState(null);
  const [activities, setActivities] = useState([]);
  const [words, setWords] = useState([]);

  useEffect(() => {
    let active = true;
    getUserProfile(uid).then((row) => active && setStudent(row));
    const stop1 = watchChapterProgress(uid, setProgress);
    const stop2 = watchSettings(setSettingsRemote);
    const stop3 = watchStudyActivities(uid, setActivities);
    const stop4 = watchVocabulary(uid, setWords);
    return () => { active = false; stop1(); stop2(); stop3(); stop4(); };
  }, [uid]);

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(settingsRemote || {}) }), [settingsRemote]);
  const metrics = useMemo(() => dashboardMetrics(subjects, progress, settings), [progress, settings]);

  const weakRows = useMemo(() => subjects.flatMap((subject) => subject.chapters.map((chapter) => {
    const row = progress[chapter.id] || {};
    return { subject, chapter, row, metrics: chapterMetrics(row, settings) };
  })).filter((item) => item.metrics.readiness === "Weak" || item.metrics.maxDelay > settings.delayWarningDays)
    .sort((a, b) => (b.metrics.maxDelay + (b.metrics.readiness === "Weak" ? 50 : 0)) - (a.metrics.maxDelay + (a.metrics.readiness === "Weak" ? 50 : 0))), [progress, settings]);

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const todayActivities = activities.filter((item) => item.scheduledDate === today);
  const activityStatus = {
    NOT_STARTED: ["Not started", "neutral"],
    PENDING: ["Pending", "warning"],
    COMPLETED: ["Completed", "success"],
  };

  return (
    <AppShell admin title={student?.name || "Student progress"} subtitle={student?.email || "Live student dashboard"} actions={<Link href="/admin" className="secondary-btn compact">← All students</Link>}>
      <section className="stats-grid four">
        <StatCard label="Latest average" value={pct(metrics.overallLatest)} />
        <StatCard label="Board ready" value={pct(metrics.boardReadyPercent)} tone="success" />
        <StatCard label="First cut" value={pct(metrics.firstCutPercent)} tone="purple" />
        <StatCard label="Weak areas" value={metrics.weak} tone={metrics.weak ? "danger" : "success"} />
      </section>

      <div className="dashboard-grid">
        <section className="panel-card">
          <div className="section-heading"><div><p className="eyebrow">Subjects</p><h2>Subject health</h2></div></div>
          <div className="subject-list">
            {metrics.subjectRows.map((row) => (
              <div className="subject-row static" key={row.subject.slug}>
                <div className="subject-icon">{row.subject.icon}</div>
                <div className="subject-row-main"><div className="subject-row-title"><strong>{row.subject.name}</strong><span className={`pill ${statusTone(row.currentStatus)}`}>{row.currentStatus}</span></div><div className="mini-progress"><span style={{ width: `${Math.min(100, row.avgLatest)}%` }} /></div><small>{Math.round(row.firstCutPercent)}% first cut • {row.weak} weak • {row.boardReady} ready</small></div>
                <strong className="subject-score">{Math.round(row.avgLatest)}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <div className="section-heading"><div><p className="eyebrow">Attention</p><h2>Weak or delayed chapters</h2></div></div>
          {weakRows.length ? <div className="attention-list">{weakRows.slice(0, 12).map((item) => (
            <div className="attention-row" key={item.chapter.id}><div><strong>{item.chapter.title}</strong><small>{item.subject.name}{item.row.mainWeakness ? ` • ${item.row.mainWeakness}` : ""}</small></div><div><span className={`pill ${statusTone(item.metrics.readiness)}`}>{item.metrics.readiness}</span><small>{item.metrics.latest === null ? "No score" : `${Math.round(item.metrics.latest)}%`}{item.metrics.maxDelay > 0 ? ` • +${item.metrics.maxDelay}d` : ""}</small></div></div>
          ))}</div> : <div className="empty-state"><span>✓</span><strong>No weak or delayed chapters</strong></div>}
        </section>
      </div>

      <div className="dashboard-grid admin-study-grid">
        <section className="panel-card">
          <div className="section-heading"><div><p className="eyebrow">Today</p><h2>Timetable activity</h2></div><span className="pill blue">{todayActivities.length} planned</span></div>
          {todayActivities.length ? <div className="admin-activity-list">{todayActivities.map((item) => {
            const [label, tone] = activityStatus[item.status] || activityStatus.NOT_STARTED;
            return <div className="admin-activity-row" key={item.id}><div className="admin-activity-time"><strong>{item.startTime || "Anytime"}</strong><small>{item.endTime || ""}</small></div><div><strong>{item.title}</strong><small>{item.subject || "General"} • {item.activityType || "Study"}</small></div><span className={`pill ${tone}`}>{label}</span></div>;
          })}</div> : <div className="empty-state compact-empty"><strong>No activities planned today.</strong></div>}
        </section>

        <section className="panel-card">
          <div className="section-heading"><div><p className="eyebrow">Vocabulary</p><h2>Recently learned words</h2></div><span className="pill purple">{words.length} total</span></div>
          {words.length ? <div className="admin-word-list">{words.slice(0, 8).map((item) => <div className="admin-word-row" key={item.id}><div><strong>{item.word}</strong><small>{item.subject || "General"} • {item.learnedOn || ""}</small></div><p>{item.meaning}</p></div>)}</div> : <div className="empty-state compact-empty"><strong>No words added yet.</strong></div>}
        </section>
      </div>

      <section className="panel-card">
        <div className="section-heading"><div><p className="eyebrow">Detailed view</p><h2>All tracked chapters</h2></div></div>
        <div className="admin-chapter-table">
          {subjects.flatMap((subject) => subject.chapters.map((chapter) => {
            const row = progress[chapter.id] || {};
            const m = chapterMetrics(row, settings);
            return <div className="admin-chapter-row" key={chapter.id}><div><small>{subject.name}</small><strong>{chapter.title}</strong></div><span>{row.firstCutActual ? "First cut ✓" : "First cut —"}</span><span>{m.latest === null ? "No test" : `${Math.round(m.latest)}%`}</span><span className={`pill ${statusTone(m.readiness)}`}>{m.readiness}</span><span>{m.maxDelay ? `+${m.maxDelay}d` : "On time"}</span></div>;
          }))}
        </div>
      </section>
    </AppShell>
  );
}

export default function AdminUserPage() {
  return <RequireAuth admin><UserProgressContent /></RequireAuth>;
}
