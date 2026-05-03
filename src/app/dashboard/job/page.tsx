import { getDepartments } from "@/app/actions/department";
import styles from "./job.module.css";
import React from "react";

import JobProfileInteractiveClient from "@/components/job/JobProfileInteractiveClient";

export default async function JobProfilePage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
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
    <JobProfileInteractiveClient 
       key={currentDept.id}
       departmentId={currentDept.id}
       departmentName={currentDept.name}
       profile={currentDept.jobProfile}
       tasks={currentDept.tasks}
       initialTargetTasks={currentDept.targetTasks || []}
    />
  );
}
