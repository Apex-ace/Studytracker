"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/components/AuthProvider";
import { SUBJECT_ORDER, SUBJECTS } from "@/lib/catalog";
import { addVocabularyWord, deleteVocabularyWord, watchVocabulary } from "@/lib/firestore";

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekKey() {
  const now = new Date();
  const day = now.getDay();
  now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return dateKey(now);
}

function displayDate(value) {
  if (!value) return "Date not entered";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function WordsContent() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) return undefined;
    return watchVocabulary(user.uid, setWords);
  }, [user?.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter((item) => {
      const matchesSubject = subjectFilter === "All" || item.subject === subjectFilter;
      const haystack = `${item.word || ""} ${item.meaning || ""} ${item.exampleSentence || ""} ${item.subject || ""}`.toLowerCase();
      return matchesSubject && (!q || haystack.includes(q));
    });
  }, [words, search, subjectFilter]);

  const usedSubjects = new Set(words.map((x) => x.subject).filter(Boolean));
  const thisWeek = words.filter((x) => String(x.learnedOn || "") >= startOfWeekKey()).length;

  async function addWord(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const word = String(form.get("word") || "").trim();
    const meaning = String(form.get("meaning") || "").trim();
    if (!word || !meaning) {
      setError("Both the word and its meaning are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await addVocabularyWord(user.uid, {
        word,
        meaning,
        subject: String(form.get("subject") || "General"),
        learnedOn: String(form.get("learnedOn") || dateKey()),
        exampleSentence: String(form.get("exampleSentence") || "").trim(),
        notes: String(form.get("notes") || "").trim(),
      });
      formElement.reset();
      setShowForm(false);
    } catch (e) {
      setError(e?.message || "Unable to save the word.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Words & Meanings"
      subtitle="Build your own vocabulary notebook from everything you learn."
      actions={<button className="primary-btn compact desktop-action" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ New word"}</button>}
    >
      <section className="vocab-hero">
        <div><p className="eyebrow">My vocabulary</p><h2>One new word at a time.</h2><p className="muted">Save the word, its meaning and an example sentence so it is easy to revise later.</p></div>
        <div className="vocab-hero-mark">Aa</div>
      </section>

      <section className="stats-grid three compact-stats">
        <StatCard label="Words learned" value={words.length} helper="Your notebook" />
        <StatCard label="This week" value={thisWeek} helper="New additions" tone="success" />
        <StatCard label="Subjects" value={usedSubjects.size} helper="With vocabulary" tone="purple" />
      </section>

      <button className="primary-btn mobile-add" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close form" : "+ Add new word"}</button>

      {showForm && (
        <section className="panel-card form-panel">
          <div className="section-heading"><div><p className="eyebrow">New learning</p><h2>Add word & meaning</h2></div></div>
          <form className="vocab-form" onSubmit={addWord}>
            <div className="form-grid two">
              <label>New word<input name="word" placeholder="e.g. Perseverance" autoFocus /></label>
              <label>Meaning<input name="meaning" placeholder="Continuing despite difficulty" /></label>
            </div>
            <div className="form-grid two">
              <label>Subject
                <select name="subject" defaultValue="General">
                  <option>General</option>
                  {SUBJECT_ORDER.map((slug) => <option key={slug}>{SUBJECTS[slug].name}</option>)}
                </select>
              </label>
              <label>Learned on<input name="learnedOn" type="date" defaultValue={dateKey()} /></label>
            </div>
            <label>Example sentence<textarea name="exampleSentence" placeholder="Use the word in your own sentence." /></label>
            <label>Extra note<textarea name="notes" placeholder="Synonym, antonym, pronunciation or where you found the word." /></label>
            {error && <div className="error-box">{error}</div>}
            <div className="form-actions-right"><button type="button" className="ghost-btn compact" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn compact" disabled={saving}>{saving ? "Saving…" : "Save word"}</button></div>
          </form>
        </section>
      )}

      <section className="panel-card">
        <div className="vocab-toolbar">
          <div><p className="eyebrow">Notebook</p><h2>{filtered.length} {filtered.length === 1 ? "word" : "words"}</h2></div>
          <div className="vocab-filters">
            <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search word or meaning…" />
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option>All</option>
              <option>General</option>
              {SUBJECT_ORDER.map((slug) => <option key={slug}>{SUBJECTS[slug].name}</option>)}
            </select>
          </div>
        </div>

        {filtered.length ? (
          <div className="vocab-grid">
            {filtered.map((item) => (
              <article className="vocab-card" key={item.id}>
                <div className="vocab-card-top">
                  <div><span className="vocab-letter">{String(item.word || "?").slice(0, 1).toUpperCase()}</span><div><small>{item.subject || "General"}</small><h3>{item.word}</h3></div></div>
                  <button className="danger-text" onClick={() => deleteVocabularyWord(user.uid, item.id)}>Delete</button>
                </div>
                <div className="meaning-box"><span>Meaning</span><p>{item.meaning}</p></div>
                {item.exampleSentence && <div className="example-box"><span>Example</span><p>“{item.exampleSentence}”</p></div>}
                {item.notes && <p className="vocab-note">{item.notes}</p>}
                <small className="vocab-date">Learned {displayDate(item.learnedOn)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><span>Aa</span><strong>No words found</strong><p>Add a new word you learned today, along with its meaning.</p></div>
        )}
      </section>
    </AppShell>
  );
}

export default function WordsPage() {
  return <RequireAuth><WordsContent /></RequireAuth>;
}
