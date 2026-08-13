"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/components/AuthProvider";
import { SUBJECT_ORDER, SUBJECTS } from "@/lib/catalog";
import {
  addStudyActivity,
  deleteStudyActivity,
  updateStudyActivityStatus,
  watchStudyActivities,
  syncExistingChapterPlansToTimetable,
} from "@/lib/firestore";

const STATUS = {
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  PENDING: { label: "Pending", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

const ACTIVITY_TYPES = ["Study", "Revision", "Homework", "Test", "Reading", "Practice", "Other"];

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function shiftDate(value, amount) {
  const d = parseDateKey(value);
  d.setDate(d.getDate() + amount);
  return dateKey(d);
}

function getWeek(value) {
  const selected = parseDateKey(value);
  const day = selected.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(selected);
  monday.setDate(selected.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return {
      key: dateKey(d),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2),
      date: d.getDate(),
    };
  });
}

function humanDate(value) {
  return parseDateKey(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function statusInfo(status) {
  return STATUS[status] || STATUS.NOT_STARTED;
}

function TimetableContent() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => dateKey());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) return undefined;
    return watchStudyActivities(user.uid, setActivities);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    syncExistingChapterPlansToTimetable(user.uid).catch((e) => {
      console.error("Unable to sync chapter plan with timetable", e);
    });
  }, [user?.uid]);

  const week = useMemo(() => getWeek(selectedDate), [selectedDate]);
  const dayActivities = useMemo(
    () => activities.filter((item) => item.scheduledDate === selectedDate),
    [activities, selectedDate],
  );

  const counts = useMemo(() => ({
    total: dayActivities.length,
    completed: dayActivities.filter((x) => x.status === "COMPLETED").length,
    pending: dayActivities.filter((x) => x.status === "PENDING").length,
    notStarted: dayActivities.filter((x) => !x.status || x.status === "NOT_STARTED").length,
  }), [dayActivities]);

  async function addActivity(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    if (!title) {
      setError("Activity title is required.");
      setSaving(false);
      return;
    }

    try {
      await addStudyActivity(user.uid, {
        title,
        subject: String(form.get("subject") || "General"),
        activityType: String(form.get("activityType") || "Study"),
        scheduledDate: String(form.get("scheduledDate") || selectedDate),
        startTime: String(form.get("startTime") || ""),
        endTime: String(form.get("endTime") || ""),
        status: String(form.get("status") || "NOT_STARTED"),
        notes: String(form.get("notes") || "").trim(),
      });
      formElement.reset();
      setShowForm(false);
    } catch (e) {
      setError(e?.message || "Unable to add activity.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(activity, status) {
    await updateStudyActivityStatus(user.uid, activity.id, status);
  }

  return (
    <AppShell
      title="Timetable"
      subtitle="Chapter First Cut and Revision dates appear here automatically, along with your own activities."
      actions={<button className="primary-btn compact desktop-action" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Activity"}</button>}
    >
      <section className="panel-card timetable-date-card">
        <div className="date-nav-row">
          <button className="ghost-btn compact" onClick={() => setSelectedDate(shiftDate(selectedDate, -7))}>← Week</button>
          <div className="date-title-block">
            <p className="eyebrow">Selected day</p>
            <h2>{humanDate(selectedDate)}</h2>
          </div>
          <div className="date-nav-actions">
            <button className="secondary-btn compact" onClick={() => setSelectedDate(dateKey())}>Today</button>
            <button className="ghost-btn compact" onClick={() => setSelectedDate(shiftDate(selectedDate, 7))}>Week →</button>
          </div>
        </div>

        <div className="week-strip">
          {week.map((item) => (
            <button key={item.key} className={item.key === selectedDate ? "week-day active" : "week-day"} onClick={() => setSelectedDate(item.key)}>
              <span>{item.day}</span>
              <strong>{item.date}</strong>
              {activities.some((x) => x.scheduledDate === item.key) && <i />}
            </button>
          ))}
        </div>
      </section>

      <section className="stats-grid four compact-stats">
        <StatCard label="Activities" value={counts.total} helper="Selected day" />
        <StatCard label="Completed" value={counts.completed} helper="Done" tone="success" />
        <StatCard label="Pending" value={counts.pending} helper="Needs attention" tone="purple" />
        <StatCard label="Not started" value={counts.notStarted} helper="Still to begin" tone={counts.notStarted ? "danger" : "success"} />
      </section>

      <button className="primary-btn mobile-add" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close form" : "+ Add activity"}</button>

      {showForm && (
        <section className="panel-card form-panel">
          <div className="section-heading"><div><p className="eyebrow">New plan</p><h2>Add study activity</h2></div></div>
          <form className="study-activity-form" onSubmit={addActivity}>
            <div className="form-grid two">
              <label>Activity title<input name="title" placeholder="e.g. Revise quadratic equations" autoFocus /></label>
              <label>Subject
                <select name="subject" defaultValue="General">
                  <option>General</option>
                  {SUBJECT_ORDER.map((slug) => <option key={slug}>{SUBJECTS[slug].name}</option>)}
                </select>
              </label>
            </div>
            <div className="form-grid four">
              <label>Type<select name="activityType" defaultValue="Study">{ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Date<input name="scheduledDate" type="date" defaultValue={selectedDate} /></label>
              <label>Start time<input name="startTime" type="time" /></label>
              <label>End time<input name="endTime" type="time" /></label>
            </div>
            <div className="form-grid two">
              <label>Status
                <select name="status" defaultValue="NOT_STARTED">
                  <option value="NOT_STARTED">Not started</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label>Notes<textarea name="notes" placeholder="What exactly should be completed?" /></label>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="form-actions-right"><button type="button" className="ghost-btn compact" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn compact" disabled={saving}>{saving ? "Saving…" : "Add activity"}</button></div>
          </form>
        </section>
      )}

      <section className="panel-card">
        <div className="section-heading"><div><p className="eyebrow">Daily plan</p><h2>{dayActivities.length ? `${dayActivities.length} activities` : "Nothing planned yet"}</h2></div></div>
        {dayActivities.length ? (
          <div className="activity-list">
            {dayActivities.map((activity) => {
              const info = statusInfo(activity.status);
              return (
                <article className={`activity-card status-${String(activity.status || "NOT_STARTED").toLowerCase()}`} key={activity.id}>
                  <div className="activity-time">
                    <strong>{activity.startTime || "Anytime"}</strong>
                    <span>{activity.endTime ? `to ${activity.endTime}` : ""}</span>
                  </div>
                  <div className="activity-main">
                    <div className="activity-title-row"><strong>{activity.title}</strong><span className={`pill ${info.tone}`}>{info.label}</span></div>
                    <small>
                      {activity.subject || "General"} • {activity.activityType || "Study"}
                      {activity.autoGenerated ? " • Auto from chapter plan" : ""}
                    </small>
                    {activity.notes && <p>{activity.notes}</p>}
                    <div className="activity-status-actions">
                      <button className={activity.status === "NOT_STARTED" ? "status-btn active" : "status-btn"} onClick={() => setStatus(activity, "NOT_STARTED")}>Not started</button>
                      <button className={activity.status === "PENDING" ? "status-btn pending active" : "status-btn pending"} onClick={() => setStatus(activity, "PENDING")}>Pending</button>
                      <button className={activity.status === "COMPLETED" ? "status-btn complete active" : "status-btn complete"} onClick={() => setStatus(activity, "COMPLETED")}>✓ Completed</button>
                    </div>
                  </div>
                  {activity.autoGenerated ? (
                    <span className="activity-delete muted" title="Change or remove the planned date from the chapter card.">Linked</span>
                  ) : (
                    <button className="danger-text activity-delete" onClick={() => deleteStudyActivity(user.uid, activity.id)}>Delete</button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><span>＋</span><strong>No activities on this day</strong><p>Add study, revision, homework, reading or test activities to build your timetable.</p></div>
        )}
      </section>
    </AppShell>
  );
}

export default function TimetablePage() {
  return <RequireAuth><TimetableContent /></RequireAuth>;
}
