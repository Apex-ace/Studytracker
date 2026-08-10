"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import ChapterCard from "@/components/ChapterCard";
import StatCard from "@/components/StatCard";
import { getSubject } from "@/lib/catalog";
import { useTracker } from "@/lib/useTracker";
import { subjectMetrics, chapterMetrics } from "@/lib/performance";
import { pct } from "@/lib/format";

function SubjectContent() {
  const params = useParams();
  const subject = getSubject(params.slug);
  const { uid, progress, settings } = useTracker();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const metrics = useMemo(
    () => subject ? subjectMetrics(subject.chapters, progress, settings) : null,
    [subject, progress, settings],
  );

  const filtered = useMemo(() => {
    if (!subject) return [];
    return subject.chapters.filter((chapter) => {
      const m = chapterMetrics(progress[chapter.id] || {}, settings);
      const searchOk = !search.trim() || chapter.title.toLowerCase().includes(search.trim().toLowerCase());
      const filterOk = filter === "all" ||
        (filter === "weak" && m.readiness === "Weak") ||
        (filter === "ready" && ["Board Ready", "Mastered"].includes(m.readiness)) ||
        (filter === "pending" && ["Not Started", "Developing"].includes(m.readiness));
      return searchOk && filterOk;
    });
  }, [subject, progress, settings, search, filter]);

  if (!subject || !metrics) {
    return <AppShell title="Subject"><div className="empty-state"><strong>Subject not found</strong></div></AppShell>;
  }

  return (
    <AppShell title={subject.name} subtitle="The readiness rules below match the Excel tracker.">
      <section className="stats-grid four compact-stats">
        <StatCard label="Latest average" value={pct(metrics.avgLatest)} />
        <StatCard label="First cut" value={pct(metrics.firstCutPercent)} tone="purple" />
        <StatCard label="Board ready" value={`${metrics.boardReady}/${metrics.trackedAreas}`} tone="success" />
        <StatCard label="Weak areas" value={metrics.weak} tone={metrics.weak ? "danger" : "success"} />
      </section>

      <section className="filter-bar">
        <input className="search-input" placeholder="Search chapter…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="filter-chips">
          {[['all','All'],['pending','Pending'],['weak','Weak'],['ready','Ready']].map(([value,label]) => (
            <button key={value} onClick={() => setFilter(value)} className={filter === value ? "filter-chip active" : "filter-chip"}>{label}</button>
          ))}
        </div>
      </section>

      <div className="chapter-list">
        {filtered.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            uid={uid}
            chapter={chapter}
            subjectSlug={subject.slug}
            saved={progress[chapter.id]}
            settings={settings}
          />
        ))}
      </div>
      {!filtered.length && <div className="empty-state"><strong>No chapters match this filter.</strong></div>}
    </AppShell>
  );
}

export default function SubjectPage() {
  return <RequireAuth><SubjectContent /></RequireAuth>;
}
