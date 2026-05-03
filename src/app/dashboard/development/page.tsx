import { getDepartments } from "@/app/actions/department";
import DevelopmentClient from "@/components/development/DevelopmentClient";
import React from "react";

export default async function DevelopmentPage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
  const departments = await getDepartments();
  let currentDept = departments[0] as any;

  const searchParams = await props.searchParams;
  if (searchParams?.deptId) {
    const found = departments.find((d: any) => d.id === searchParams?.deptId);
    if (found) currentDept = found as any;
  }

  if (!currentDept) {
    return <div style={{ padding: "3rem" }}>Keine Abteilung gefunden.</div>;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <DevelopmentClient 
         department={currentDept} 
         members={currentDept.members}
         tasks={currentDept.tasks}
         skillCategories={currentDept.skillCategories}
      />
    </div>
  );
}
