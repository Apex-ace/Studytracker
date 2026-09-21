"use client";

import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import { useTracker } from "@/lib/useTracker";
import { subjectMetrics } from "@/lib/performance";
import { statusTone } from "@/lib/format";

function CutProgress({ label, value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="subject-cut-row">
      <div><span>{label}</span><strong>{Math.round(safe)}%</strong></div>
      <div className="subject-cut-bar"><span style={{ width: `${safe}%` }} /></div>
    </div>
  );
}

function SubjectsContent() {
  const { subjects, progress, settings } = useTracker();

  return (
    <AppShell title="Subjects">
      <div className="subject-card-grid">
        {subjects.map((subject) => {
          const metrics = subjectMetrics(subject.chapters, progress, settings);
          return (
            <Link href={`/subjects/${subject.slug}`} className="subject-card subject-card-clean" key={subject.slug}>
              <div className="subject-card-heading">
                <div>
                  <h2>{subject.name}</h2>
                  <p className="muted">{metrics.trackedAreas} tracked areas</p>
                </div>
                <span className={`pill ${statusTone(metrics.currentStatus)}`}>{metrics.currentStatus}</span>
              </div>
              <div className="subject-card-metrics cut-bars-only">
                <CutProgress label="First Cut" value={metrics.firstCutPercent} />
                <CutProgress label="Second Cut" value={metrics.secondCutPercent} />
                <CutProgress label="Third Cut" value={metrics.thirdCutPercent} />
              </div>
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
