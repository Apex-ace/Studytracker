"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

const studentNav = [
  ["/dashboard", "⌂", "Home"],
  ["/subjects", "▦", "Subjects"],
  ["/mock-tests", "✓", "Tests"],
  ["/skills", "◎", "Skills"],
];

const adminNav = [
  ["/admin", "◉", "Overview"],
  ["/dashboard", "⌂", "My view"],
];

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
          <div className="brand-mark">P</div>
          <div>
            <strong>BoardTrack</strong>
            <small>Class X • 2027</small>
          </div>
        </div>

        <nav className="side-links">
          {nav.map(([href, icon, label]) => (
            <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "nav-link active" : "nav-link"}>
              <span>{icon}</span>{label}
            </Link>
          ))}
          {profile?.role === "admin" && !admin && (
            <Link href="/admin" className="nav-link"><span>◉</span>Admin</Link>
          )}
        </nav>

        <button className="ghost-btn full" onClick={logout}>Sign out</button>
      </aside>

      <main className="app-main">
        <header className="top-bar">
          <div>
            <p className="eyebrow">{admin ? "Admin view" : "Student tracker"}</p>
            <h1>{title}</h1>
            {subtitle && <p className="muted top-subtitle">{subtitle}</p>}
          </div>
          <div className="top-actions">
            {actions}
            <div className="avatar">{String(profile?.name || profile?.email || "U").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>

      <nav className="bottom-nav">
        {nav.map(([href, icon, label]) => (
          <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "bottom-link active" : "bottom-link"}>
            <span className="bottom-icon">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
        {profile?.role === "admin" && !admin && (
          <Link href="/admin" className="bottom-link">
            <span className="bottom-icon">◉</span><span>Admin</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
