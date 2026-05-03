import { getDepartments } from "@/app/actions/department";
import TasksInteractiveClient from "@/components/tasks/TasksInteractiveClient";
import React from "react";

export default async function TasksPage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
  const departments = await getDepartments();
  let currentDept = departments[0];

  const searchParams = await props.searchParams;
  if (searchParams?.deptId) {
    const found = departments.find(d => d.id === searchParams?.deptId);
    if (found) currentDept = found;
  }

  if (!currentDept) {
    return <div style={{ padding: "3rem", fontStyle: "italic", color: "var(--on-surface-variant)" }}>Keine Abteilung gefunden.</div>;
  }

  return (
    <TasksInteractiveClient 
       key={currentDept.id}
       departmentId={currentDept.id}
       tasks={currentDept.tasks}
       skillCategories={currentDept.skillCategories}
       members={currentDept.members}
    />
  );
}
