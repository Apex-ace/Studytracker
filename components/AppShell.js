"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

const studentNav = [
  ["/dashboard", "Home", "Home"],
  ["/timetable", "Timetable", "Plan"],
  ["/subjects", "Subjects", "Subjects"],
  ["/words", "Words & Meanings", "Words"],
  ["/mock-tests", "Mock Tests", "Tests"],
  ["/skills", "Skills", "Skills"],
];

const adminNav = [
  ["/admin", "Overview", "Overview"],
  ["/admin/planner", "Work planner", "Planner"],
  ["/dashboard", "My view", "My view"],
];

function isActive(pathname, href) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/users/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children, title, subtitle, admin = false, actions = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const nav = admin ? adminNav : studentNav;

  async function logout() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="app-frame">
      <aside className="side-nav">
        <div className="brand-block">
          <div>
            <strong>BoardTrack</strong>
            <small>Class X • 2027</small>
          </div>
        </div>

        <nav className="side-links">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? "nav-link active" : "nav-link"}>
              {label}
            </Link>
          ))}
          {profile?.role === "admin" && !admin && (
            <Link href="/admin" className="nav-link">Admin</Link>
          )}
        </nav>

        <button className="ghost-btn full" onClick={logout}>Sign out</button>
      </aside>

      <main className="app-main">
        <header className="top-bar">
          <div className="top-title-wrap">
            <h1>{title}</h1>
            {subtitle && <p className="muted top-subtitle">{subtitle}</p>}
          </div>
          <div className="top-actions">
            {actions}
            <div className="avatar" aria-label="Profile initial">{String(profile?.name || profile?.email || "U").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {nav.map(([href, , mobileLabel]) => (
          <Link key={href} href={href} className={isActive(pathname, href) ? "bottom-link active" : "bottom-link"}>
            {mobileLabel}
          </Link>
        ))}
        {profile?.role === "admin" && !admin && (
          <Link href="/admin" className="bottom-link">Admin</Link>
        )}
      </nav>
    </div>
  );
}
