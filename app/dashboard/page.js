"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/components/AuthProvider";
import { useTracker } from "@/lib/useTracker";
import { pct, statusTone } from "@/lib/format";
import { mockTestMetrics, priorityChapters } from "@/lib/performance";
import { watchMockTests } from "@/lib/firestore";

function testSubjects(test) {
  if (Array.isArray(test.subjects) && test.subjects.length) return test.subjects.join(", ");
  return test.subject || "—";
}

function testChapters(test) {
  if (Array.isArray(test.chapters) && test.chapters.length) return test.chapters.join(", ");
  return test.chapter || "Full syllabus";
}

function DashboardContent() {
  const { profile } = useAuth();
  const { uid, dashboard, progress, settings, subjects } = useTracker();
  const [tests, setTests] = useState([]);
  const priorities = priorityChapters(subjects, progress, settings, 5);

  useEffect(() => {
    if (!uid) return undefined;
    return watchMockTests(uid, setTests);
  }, [uid]);

  return (
    <AppShell title={`Hi ${String(profile?.name || "Student").split(" ")[0]}`}>
      <section className="hero-card dashboard-hero-clean">
        <div className="hero-copy">
          <p className="eyebrow">Overall preparation</p>
          <h2>{dashboard.scoredAreas ? `Latest test ${Math.round(dashboard.overallLatest)}%` : "No test yet"}</h2>
          <div className="hero-actions">
            <Link href="/timetable" className="primary-btn compact">Open timetable</Link>
            <Link href="/subjects" className="secondary-btn compact">Subjects</Link>
          </div>
        </div>
        <div className="board-ready-summary">
          <span>Board ready</span>
          <strong>{Math.round(dashboard.boardReadyPercent)}%</strong>
        </div>
      </section>

      <section className="stats-grid three cut-summary-stats">
        <StatCard label="First Cut" value={pct(dashboard.firstCutPercent)} tone="success" />
        <StatCard label="Second Cut" value={pct(dashboard.secondCutPercent)} tone="purple" />
        <StatCard label="Third Cut" value={pct(dashboard.thirdCutPercent)} tone="blue" />
      </section>

      <div className="dashboard-grid">
        <section className="panel-card">
          <div className="section-heading">
            <h2>Progress by subject</h2>
            <Link href="/subjects" className="text-link">View all</Link>
          </div>
          <div className="subject-list">
            {dashboard.subjectRows.map((row) => (
              <Link href={`/subjects/${row.subject.slug}`} className="subject-row subject-row-clean" key={row.subject.slug}>
                <div className="subject-row-main">
                  <div className="subject-row-title">
                    <strong>{row.subject.name}</strong>
                    <span className={`pill ${statusTone(row.currentStatus)}`}>{row.currentStatus}</span>
                  </div>
                  <div className="subject-cut-inline">
                    <span>First {Math.round(row.firstCutPercent)}%</span>
                    <span>Second {Math.round(row.secondCutPercent)}%</span>
                    <span>Third {Math.round(row.thirdCutPercent)}%</span>
                  </div>
                </div>
                <strong className="subject-score">{row.scoredAreas ? `Latest test ${Math.round(row.avgLatest)}%` : "No test yet"}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel-card">
          <div className="section-heading"><h2>What to work on next</h2></div>
          {priorities.length ? (
            <div className="priority-list">
              {priorities.map((item, index) => (
                <Link href={`/subjects/${item.subject.slug}`} key={item.chapter.id} className="priority-item">
                  <span className="priority-rank">{index + 1}</span>
                  <div>
                    <strong>{item.chapter.title}</strong>
                    <small>{item.subject.name} • {item.metrics.readiness}{item.metrics.latest !== null ? ` • ${Math.round(item.metrics.latest)}%` : ""}</small>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty"><strong>No urgent chapters</strong></div>
          )}
        </section>
      </div>

      <section className="panel-card test-details-panel">
        <div className="section-heading">
          <h2>Test details</h2>
          <Link href="/mock-tests" className="text-link">View all</Link>
        </div>
        {tests.length ? (
          <div className="test-details-table">
            <div className="test-details-row header">
              <span>Date</span><span>Subject</span><span>Chapter</span><span>Marks</span><span>Percentage</span>
            </div>
            {tests.slice(0, 10).map((test) => {
              const metrics = mockTestMetrics(test, settings);
              return (
                <div className="test-details-row" key={test.id}>
                  <span data-label="Date">{test.date || "—"}</span>
                  <span data-label="Subject">{testSubjects(test)}</span>
                  <span data-label="Chapter">{testChapters(test)}</span>
                  <strong data-label="Marks">{test.marksObtained ?? "—"}/{test.totalMarks ?? "—"}</strong>
                  <strong data-label="Percentage">{metrics.scorePercent === null ? "—" : pct(metrics.scorePercent, 1)}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact-empty"><strong>No test details yet</strong></div>
        )}
      </section>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <RequireAuth><DashboardContent /></RequireAuth>;
}
