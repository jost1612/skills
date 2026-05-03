"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ListTodo, UserCheck, Database, FileText, Filter, LineChart, Users, Bot } from "lucide-react";
import styles from "./Sidebar.module.css";

const navItems = [
  { id: "tasks", icon: ListTodo, label: "Aufgaben", href: "/dashboard/tasks" },
  { id: "assignments", icon: UserCheck, label: "Zuweisung", href: "/dashboard/assignments" },
  { id: "matrix", icon: Database, label: "Matrix", href: "/dashboard/matrix" },
  { id: "job", icon: FileText, label: "Soll-Profil", href: "/dashboard/job" },
  { id: "radar", icon: Filter, label: "Radar", href: "/dashboard/radar" },
  { id: "development", icon: LineChart, label: "Entwicklung", href: "/dashboard/development" },
  { id: "users", icon: Users, label: "Benutzer", href: "/dashboard/users", adminOnly: true },
  { id: "ai", icon: Bot, label: "KI Assistent", href: "/dashboard/ai", aiOnly: true }
];

export default function Sidebar({ user }: { user?: { role?: string, canUseAI?: boolean } }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deptId = searchParams.get("deptId");
  
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`} 
        onClick={() => setIsOpen(false)}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.topSection}>
        <div className={styles.logoContainer}>
          <div className={styles.logoMark}></div>
          <div>
            <h1 className={styles.title}>Kinetic Matrix</h1>
            <p className={styles.subtitle}>Kompetenz-Management</p>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((nav) => {
          if (nav.adminOnly && user?.role !== "ADMIN") return null;
          if (nav.aiOnly && !user?.canUseAI) return null;

          const isActive = pathname.startsWith(nav.href);
          return (
            <Link
              key={nav.id}
              href={deptId ? `${nav.href}?deptId=${deptId}` : nav.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <nav.icon className={`${styles.icon} ${isActive ? styles.iconActive : ""}`} />
              {nav.label}
            </Link>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
