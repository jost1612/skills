import { getDepartments } from "@/app/actions/department";
import styles from "./matrix.module.css";

import MatrixInteractiveClient from "@/components/matrix/MatrixInteractiveClient";

export default async function MatrixPage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
  const departments = await getDepartments();
  let currentDept = departments[0];

  const searchParams = await props.searchParams;
  if (searchParams?.deptId) {
    const found = departments.find(d => d.id === searchParams?.deptId);
    if (found) currentDept = found;
  }

  if (!currentDept) {
    return (
      <div className={styles.emptyState}>
        Keine Abteilung gefunden. Bitte konfigurieren Sie zunächst eine Abteilung.
      </div>
    );
  }

  return (
    <MatrixInteractiveClient 
      key={currentDept.id}
      departmentId={currentDept.id}
      departmentName={currentDept.name}
      members={currentDept.members}
      skillCategories={currentDept.skillCategories}
      tasks={currentDept.tasks}
    />
  );
}
