import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import styles from "./dashboard.module.css";
import Header from "@/components/layout/Header";
import { getDepartments } from "@/app/actions/department";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const departments = await getDepartments();
  const deptsList = departments.map(d => ({ id: d.id, name: d.name }));

  return (
    <div className={styles.container}>
      <Sidebar user={session.user as any} />
      <div className={styles.mainContent}>
        <Header user={session.user} departments={deptsList} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
