import { getDepartments } from "@/app/actions/department";
import styles from "./assignments.module.css";
import React from "react";

import AssignmentsInteractiveClient from "@/components/assignments/AssignmentsInteractiveClient";

export default async function AssignmentsPage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
  const departments = await getDepartments();
  let currentDept = departments[0];

  const searchParams = await props.searchParams;
  if (searchParams?.deptId) {
    const found = departments.find(d => d.id === searchParams?.deptId);
    if (found) currentDept = found;
  }

  if (!currentDept) {
    return <div className={styles.emptyState}>Keine Abteilung gefunden.</div>;
  }

  return (
    <AssignmentsInteractiveClient 
      key={currentDept.id}
      departmentId={currentDept.id}
      members={currentDept.members}
      tasks={currentDept.tasks}
    />
  );
}
