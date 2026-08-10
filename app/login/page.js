"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile, updateUserProfile } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [loading, user, profile, router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(result.user, { displayName: name.trim() });
        await ensureUserProfile(result.user, name.trim());
        if (name.trim()) await updateUserProfile(result.user.uid, { name: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(err?.message?.replace("Firebase: ", "") || "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-badge">CBSE Class X • Board 2027</div>
        <h1>Study with a clear plan, not guesswork.</h1>
        <p>Track chapters, revisions, tests, weak areas and mock papers from one mobile-friendly dashboard.</p>
        <div className="auth-feature-row">
          <span>✓ Chapter readiness</span>
          <span>✓ Mock analysis</span>
          <span>✓ Parent/admin view</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="brand-inline"><div className="brand-mark">P</div><strong>BoardTrack</strong></div>
        <h2>{mode === "login" ? "Welcome back" : "Create student account"}</h2>
        <p className="muted">{mode === "login" ? "Continue your board preparation." : "Your tracker will start with the workbook syllabus."}</p>

        <form onSubmit={submit} className="stack-form">
          {mode === "register" && (
            <label>Student name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Pulkit" /></label>
          )}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Minimum 6 characters" /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>

        <button className="text-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New student? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
