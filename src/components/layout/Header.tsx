"use client";

import { signOut } from "next-auth/react";
import { Search, LogOut, Menu } from "lucide-react";
import styles from "./Header.module.css";
import type { User } from "next-auth";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function Header({ user, departments = [] }: { user?: User, departments?: {id: string, name: string}[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const currentDeptId = searchParams.get("deptId") || (departments.length > 0 ? departments[0].id : "");

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("deptId", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.mobileActions}>
         <button className={styles.hamburgerBtn} onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}>
           <Menu size={24} />
         </button>
      </div>
      <div className={styles.searchContainer}>
        {/* Department Filter Selector */}
        <select 
           value={currentDeptId} 
           onChange={handleDeptChange}
           className={styles.deptSelector}
        >
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Aufgaben, Mitarbeiter, Skills..." 
            className={styles.searchInput}
          />
        </div>
      </div>
      
      <div className={styles.actions}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          <span className={styles.userEmail}>{user?.email}</span>
        </div>
        <button 
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/login");
          }} 
          className={styles.logoutBtn} 
          title="Abmelden"
        >
          <LogOut className={styles.logoutIcon} />
        </button>
      </div>
    </header>
  );
}
