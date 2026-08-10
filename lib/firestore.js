import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

export async function saveChapterProgress(uid, chapter, subjectSlug, values) {
  const ref = doc(db, "chapterProgress", `${uid}_${chapter.id}`);
  await setDoc(
    ref,
    {
      userId: uid,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      subjectSlug,
      subjectName: subjectSlug,
      ...values,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
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

export async function updateUserProfile(uid, values) {
  await updateDoc(doc(db, "users", uid), {
    ...values,
    updatedAt: serverTimestamp(),
  });
}
