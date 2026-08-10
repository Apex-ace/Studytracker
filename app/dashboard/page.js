"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import ProgressRing from "@/components/ProgressRing";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/components/AuthProvider";
import { useTracker } from "@/lib/useTracker";
import { pct, statusTone } from "@/lib/format";
import { priorityChapters } from "@/lib/performance";

function DashboardContent() {
  const { profile } = useAuth();
  const { dashboard, progress, settings, subjects } = useTracker();
  const priorities = priorityChapters(subjects, progress, settings, 5);

  return (
    <AppShell
      title={`Hi ${String(profile?.name || "Student").split(" ")[0]}`}
      subtitle="Here is where your board preparation stands today."
    >

      <section className="stats-grid four">
        <StatCard label="Latest average" value={pct(dashboard.overallLatest)} helper={`Goal ${settings.defaultTarget}%`} />
        <StatCard label="Board ready" value={pct(dashboard.boardReadyPercent)} helper={`${dashboard.trackedAreas} areas tracked`} tone="success" />
        <StatCard label="First cut" value={pct(dashboard.firstCutPercent)} helper="Actual completion" tone="purple" />
        <StatCard label="Weak areas" value={dashboard.weak} helper="Need priority" tone={dashboard.weak ? "danger" : "success"} />
      </section>

      <div className="dashboard-grid">
        <section className="panel-card">
          <div className="section-heading">
            <div><p className="eyebrow">Subjects</p><h2>Progress by subject</h2></div>
            <Link href="/subjects" className="text-link">View all</Link>
          </div>
          <div className="subject-list">
            {dashboard.subjectRows.map((row) => (
              <Link href={`/subjects/${row.subject.slug}`} className="subject-row" key={row.subject.slug}>
                <div className="subject-icon">{row.subject.icon}</div>
                <div className="subject-row-main">
                  <div className="subject-row-title"><strong>{row.subject.name}</strong><span className={`pill ${statusTone(row.currentStatus)}`}>{row.currentStatus}</span></div>
                  <div className="mini-progress"><span style={{ width: `${Math.min(100, row.avgLatest)}%` }} /></div>
                  <small>{Math.round(row.firstCutPercent)}% first cut • {row.weak} weak • {row.boardReady} ready</small>
                </div>
                <strong className="subject-score">{Math.round(row.avgLatest)}%</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <div className="section-heading">
            <div><p className="eyebrow">Priority list</p><h2>What to work on next</h2></div>
          </div>
          {priorities.length ? (
            <div className="priority-list">
              {priorities.map((item, index) => (
                <Link href={`/subjects/${item.subject.slug}`} key={item.chapter.id} className="priority-item">
                  <span className="priority-rank">{index + 1}</span>
                  <div><strong>{item.chapter.title}</strong><small>{item.subject.name} • {item.metrics.readiness}{item.metrics.latest !== null ? ` • ${Math.round(item.metrics.latest)}%` : ""}</small></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span>✓</span><strong>No urgent weak areas</strong><p>Add chapter scores and revision dates to build your priority list.</p></div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <RequireAuth><DashboardContent /></RequireAuth>;
}
