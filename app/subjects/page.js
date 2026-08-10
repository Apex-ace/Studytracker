"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import ProgressRing from "@/components/ProgressRing";
import { useTracker } from "@/lib/useTracker";
import { subjectMetrics } from "@/lib/performance";
import { pct, statusTone } from "@/lib/format";

function SubjectsContent() {
  const { subjects, progress, settings } = useTracker();

  return (
    <AppShell title="Subjects" subtitle="Open a subject to update chapter dates, scores and weaknesses.">
      <div className="subject-card-grid">
        {subjects.map((subject) => {
          const metrics = subjectMetrics(subject.chapters, progress, settings);
          return (
            <Link href={`/subjects/${subject.slug}`} className="subject-card" key={subject.slug}>
              <div className="subject-card-top">
                <div className="subject-big-icon">{subject.icon}</div>
                <span className={`pill ${statusTone(metrics.currentStatus)}`}>{metrics.currentStatus}</span>
              </div>
              <h2>{subject.name}</h2>
              <p className="muted">{metrics.trackedAreas} tracked areas</p>
              <div className="subject-card-metrics">
                <ProgressRing value={metrics.firstCutPercent} label="first cut" />
                <div className="metric-stack">
                  <div><span>Latest average</span><strong>{pct(metrics.avgLatest)}</strong></div>
                  <div><span>Board ready</span><strong>{metrics.boardReady}</strong></div>
                  <div><span>Weak</span><strong>{metrics.weak}</strong></div>
                </div>
              </div>
              <div className="open-row">Open tracker <span>→</span></div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

export default function SubjectsPage() {
  return <RequireAuth><SubjectsContent /></RequireAuth>;
}
