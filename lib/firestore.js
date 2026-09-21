import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function ensureUserProfile(user, name = "") {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: name || user.displayName || user.email?.split("@")[0] || "Student",
      email: user.email || "",
      role: "student",
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return ref;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchUserProfile(uid, callback) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function watchUsers(callback) {
  return onSnapshot(collection(db, "users"), (snap) => {
    const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
    callback(rows);
  });
}

export function watchChapterProgress(uid, callback) {
  const q = query(collection(db, "chapterProgress"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const byId = {};
    snap.docs.forEach((item) => {
      const data = item.data();
      byId[data.chapterId] = { id: item.id, ...data };
    });
    callback(byId);
  });
}

export function watchAllChapterProgress(callback) {
  return onSnapshot(collection(db, "chapterProgress"), (snap) => {
    const byUser = {};
    snap.docs.forEach((item) => {
      const data = item.data();
      if (!byUser[data.userId]) byUser[data.userId] = {};
      byUser[data.userId][data.chapterId] = { id: item.id, ...data };
    });
    callback(byUser);
  });
}

export function watchAllStudyActivities(callback) {
  return onSnapshot(collection(db, "studyActivities"), (snap) => {
    const rows = snap.docs.map((item) => {
      const data = item.data();
      const storedStatus = data.status || "NOT_STARTED";
      const overdue = data.scheduledDate && String(data.scheduledDate) < localDateKey();
      const status =
        !["COMPLETED", "IN_PROGRESS", "MISSED"].includes(storedStatus) && overdue
          ? "PENDING"
          : storedStatus;
      return { id: item.id, ...data, storedStatus, status };
    });
    rows.sort((a, b) => {
      const dateCompare = String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });
    callback(rows);
  });
}

export function watchAllMockTests(callback) {
  return onSnapshot(collection(db, "mockTests"), (snap) => {
    const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    callback(rows);
  });
}

const CHAPTER_PLAN_STAGES = [
  {
    key: "first-cut",
    label: "First Cut",
    plannedField: "firstCutPlanned",
    actualField: "firstCutActual",
    startTimeField: "firstCutStartTime",
    endTimeField: "firstCutEndTime",
    activityType: "Study",
  },
  {
    // Keep the original key/field names so existing Firestore documents continue
    // to update in-place while the UI uses the requested "Second Cut" wording.
    key: "revision-2",
    label: "Second Cut",
    plannedField: "rev2Planned",
    actualField: "rev2Actual",
    startTimeField: "rev2StartTime",
    endTimeField: "rev2EndTime",
    activityType: "Revision",
  },
  {
    key: "revision-3",
    label: "Third Cut",
    plannedField: "rev3Planned",
    actualField: "rev3Actual",
    startTimeField: "rev3StartTime",
    endTimeField: "rev3EndTime",
    activityType: "Revision",
  },
];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettySubjectName(subjectSlug = "") {
  return String(subjectSlug || "General")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function autoPlanStatus(plannedDate, actualDate) {
  if (actualDate) return "COMPLETED";
  if (plannedDate && plannedDate < localDateKey()) return "PENDING";
  return "NOT_STARTED";
}

function chapterPlanActivityId(uid, chapterId, stageKey) {
  return `${uid}_${chapterId}_${stageKey}`;
}

async function syncChapterPlanActivities(uid, chapter, subjectSlug, values, { removeMissing = true } = {}) {
  if (!uid || !chapter?.id) return;

  const writes = CHAPTER_PLAN_STAGES.map(async (stage) => {
    const plannedDate = String(values?.[stage.plannedField] || "").trim();
    const actualDate = String(values?.[stage.actualField] || "").trim();
    const startTime = String(values?.[stage.startTimeField] || "").trim();
    const endTime = String(values?.[stage.endTimeField] || "").trim();
    const ref = doc(
      db,
      "studyActivities",
      chapterPlanActivityId(uid, chapter.id, stage.key),
    );

    if (!plannedDate) {
      if (!removeMissing) return;
      const existing = await getDoc(ref);
      if (existing.exists() && existing.data()?.userId === uid && existing.data()?.autoGenerated === true) {
        await deleteDoc(ref);
      }
      return;
    }

    await setDoc(
      ref,
      {
        userId: uid,
        title: `${stage.label}: ${chapter.title || "Chapter"}`,
        subject: prettySubjectName(subjectSlug),
        activityType: stage.activityType,
        scheduledDate: plannedDate,
        startTime,
        endTime,
        status: autoPlanStatus(plannedDate, actualDate),
        notes: `Automatically linked to ${stage.label} in chapter progress.`,
        autoGenerated: true,
        source: "CHAPTER_PLAN",
        linkedChapterId: chapter.id,
        linkedChapterTitle: chapter.title || "",
        linkedSubjectSlug: subjectSlug || "",
        linkedStage: stage.key,
        linkedPlannedField: stage.plannedField,
        linkedActualField: stage.actualField,
        linkedActualDate: actualDate || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await Promise.all(writes);
}

export async function saveChapterProgress(uid, chapter, subjectSlug, values) {
  const ref = doc(db, "chapterProgress", `${uid}_${chapter.id}`);
  await setDoc(
    ref,
    {
      userId: uid,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      subjectSlug,
      subjectName: prettySubjectName(subjectSlug),
      ...values,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Planned First/Second/Third Cut dates are timetable activities too.
  // Deterministic document ids keep the sync duplicate-free when dates change.
  await syncChapterPlanActivities(uid, chapter, subjectSlug, values);
}

export async function assignChapterStageTask(uid, chapter, subjectSlug, stageKey, values = {}) {
  const stage = CHAPTER_PLAN_STAGES.find((item) => item.key === stageKey);
  if (!uid || !chapter?.id || !stage) throw new Error("Invalid chapter stage assignment.");

  const scheduledDate = String(values.scheduledDate || "").trim();
  if (!scheduledDate) throw new Error("Task date is required.");

  const progressRef = doc(db, "chapterProgress", `${uid}_${chapter.id}`);
  const existing = await getDoc(progressRef);
  const existingData = existing.exists() ? existing.data() : {};
  const startTime = String(values.startTime || "").trim();
  const endTime = String(values.endTime || "").trim();

  await setDoc(
    progressRef,
    {
      userId: uid,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      subjectSlug,
      subjectName: prettySubjectName(subjectSlug),
      [stage.plannedField]: scheduledDate,
      [stage.startTimeField]: startTime,
      [stage.endTimeField]: endTime,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const actualDate = String(existingData?.[stage.actualField] || "").trim();
  const activityRef = doc(db, "studyActivities", chapterPlanActivityId(uid, chapter.id, stage.key));
  await setDoc(
    activityRef,
    {
      userId: uid,
      title: `${stage.label}: ${chapter.title || "Chapter"}`,
      subject: prettySubjectName(subjectSlug),
      subjectSlug,
      chapterId: chapter.id,
      chapterTitle: chapter.title || "",
      activityType: stage.activityType,
      scheduledDate,
      startTime,
      endTime,
      status: autoPlanStatus(scheduledDate, actualDate),
      notes: String(values.notes || "").trim(),
      priority: String(values.priority || "NORMAL"),
      autoGenerated: true,
      source: "CHAPTER_PLAN",
      assignedByAdmin: true,
      assignedByUid: String(values.assignedByUid || ""),
      assignedByName: String(values.assignedByName || "Admin"),
      linkedChapterId: chapter.id,
      linkedChapterTitle: chapter.title || "",
      linkedSubjectSlug: subjectSlug || "",
      linkedStage: stage.key,
      linkedPlannedField: stage.plannedField,
      linkedActualField: stage.actualField,
      linkedActualDate: actualDate || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return activityRef;
}

export async function syncExistingChapterPlansToTimetable(uid) {
  if (!uid) return;

  const q = query(collection(db, "chapterProgress"), where("userId", "==", uid));
  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((item) => {
      const row = item.data();
      return syncChapterPlanActivities(
        uid,
        {
          id: row.chapterId,
          title: row.chapterTitle || "Chapter",
        },
        row.subjectSlug || row.subjectName || "General",
        row,
        { removeMissing: false },
      );
    }),
  );
}

export function watchSkillProgress(uid, callback) {
  const q = query(collection(db, "skillProgress"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const byId = {};
    snap.docs.forEach((item) => {
      const data = item.data();
      byId[data.skillId] = { id: item.id, ...data };
    });
    callback(byId);
  });
}

export async function saveSkillProgress(uid, skill, values) {
  const ref = doc(db, "skillProgress", `${uid}_${skill.id}`);
  await setDoc(
    ref,
    {
      userId: uid,
      skillId: skill.id,
      subject: skill.subject,
      skillName: skill.name,
      ...values,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function watchMockTests(uid, callback) {
  const q = query(collection(db, "mockTests"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    callback(rows);
  });
}

export async function addMockTest(uid, values) {
  await addDoc(collection(db, "mockTests"), {
    userId: uid,
    ...values,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMockTest(uid, id) {
  const ref = doc(db, "mockTests", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;
  await deleteDoc(ref);
}

export function watchSettings(callback) {
  return onSnapshot(doc(db, "appConfig", "performance"), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveSettings(values) {
  await setDoc(
    doc(db, "appConfig", "performance"),
    { ...values, updatedAt: serverTimestamp() },
    { merge: true },
  );
}


/* --------------------------------------------------------------------------
   Timetable / daily study activities
---------------------------------------------------------------------------- */

export function watchStudyActivities(uid, callback) {
  const q = query(collection(db, "studyActivities"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((item) => {
      const data = item.data();
      const storedStatus = data.status || "NOT_STARTED";
      const overdue = data.scheduledDate && String(data.scheduledDate) < localDateKey();
      const status =
        !["COMPLETED", "IN_PROGRESS", "MISSED"].includes(storedStatus) && overdue
          ? "PENDING"
          : storedStatus;

      return { id: item.id, ...data, storedStatus, status };
    });
    rows.sort((a, b) => {
      const dateCompare = String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });
    callback(rows);
  });
}

export async function addStudyActivity(uid, values) {
  return addDoc(collection(db, "studyActivities"), {
    userId: uid,
    status: "NOT_STARTED",
    ...values,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudyActivity(uid, id, values) {
  const ref = doc(db, "studyActivities", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;
  await updateDoc(ref, { ...values, updatedAt: serverTimestamp() });
}

export async function updateStudyActivityStatus(uid, id, status) {
  const ref = doc(db, "studyActivities", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;

  const activity = snap.data();
  const updates = { status, updatedAt: serverTimestamp() };

  if (activity.autoGenerated === true && activity.source === "CHAPTER_PLAN") {
    const chapterId = String(activity.linkedChapterId || "");
    const actualField = String(activity.linkedActualField || "");

    if (chapterId && actualField) {
      const actualDate = status === "COMPLETED" ? localDateKey() : "";
      await setDoc(
        doc(db, "chapterProgress", `${uid}_${chapterId}`),
        {
          [actualField]: actualDate,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      updates.linkedActualDate = actualDate;
    }
  }

  await updateDoc(ref, updates);
}

export async function deleteStudyActivity(uid, id) {
  const ref = doc(db, "studyActivities", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;

  // Chapter-plan activities are controlled from the Subjects page. Removing the
  // corresponding planned date there removes the timetable entry automatically.
  if (snap.data().autoGenerated === true && snap.data().source === "CHAPTER_PLAN") return;

  await deleteDoc(ref);
}

/* --------------------------------------------------------------------------
   Words & meanings / vocabulary notebook
---------------------------------------------------------------------------- */

export function watchVocabulary(uid, callback) {
  const q = query(collection(db, "vocabulary"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => {
      const dateCompare = String(b.learnedOn || "").localeCompare(String(a.learnedOn || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.word || "").localeCompare(String(b.word || ""));
    });
    callback(rows);
  });
}

export async function addVocabularyWord(uid, values) {
  return addDoc(collection(db, "vocabulary"), {
    userId: uid,
    ...values,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateVocabularyWord(uid, id, values) {
  const ref = doc(db, "vocabulary", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;
  await updateDoc(ref, { ...values, updatedAt: serverTimestamp() });
}

export async function deleteVocabularyWord(uid, id) {
  const ref = doc(db, "vocabulary", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== uid) return;
  await deleteDoc(ref);
}

export async function updateUserProfile(uid, values) {
  await updateDoc(doc(db, "users", uid), {
    ...values,
    updatedAt: serverTimestamp(),
  });
}
