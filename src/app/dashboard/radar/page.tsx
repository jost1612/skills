import { getDepartments } from "@/app/actions/department";
import RadarClient from "@/components/radar/RadarClient";
import styles from "./radar.module.css";
import React from "react";

export default async function RadarPage(props: { searchParams?: { deptId?: string | string[] | undefined } }) {
  const departments = await getDepartments();
  let currentDept = departments[0];

  const searchParams = await props.searchParams;
  if (searchParams?.deptId) {
    const found = departments.find(d => d.id === searchParams?.deptId);
    if (found) currentDept = found;
  }

  if (!currentDept) {
    return <div style={{ padding: "3rem" }}>Keine Abteilung gefunden.</div>;
  }

  // Determine required skill max-levels based on target tasks
  const targetRequiredSkills = new Map<string, number>();
  if (currentDept.targetTasks) {
     for (const tgt of currentDept.targetTasks) {
        // find task
        const task = currentDept.tasks.find(t => t.id === tgt.id);
        if (task && task.requiredSkills) {
           for (const rs of task.requiredSkills) {
              // we don't know the max level yet, we'll assign it category later
              targetRequiredSkills.set(rs.id, 5); // default or we can derive it below
           }
        }
     }
  }

  const categoryScores: any[] = [];
  
  for (const cat of currentDept.skillCategories) {
    if (cat.skills.length === 0) continue;
    
    // Max mögliche Punkte in dieser Kategorie pro User: anzahl skills * 3 (level)
    const maxScore = cat.skills.reduce((sum, s) => sum + s.level, 0);
    
    const catData: any = { category: cat.name.length > 15 ? cat.name.substring(0, 15) + "..." : cat.name };
    
    // Für jeden Member aggregieren
    for (const member of currentDept.members) {
      let memberScoreSum = 0;
      for (const skill of cat.skills) {
        const scoreObj = skill.scores.find(s => s.memberId === member.id);
        if (scoreObj && scoreObj.score > 0) {
           memberScoreSum += scoreObj.score;
        } else {
           // check if member gets derived score from their assigned tasks!
           let derived = 0;
           for (const mt of (member.assignedTasks || [])) {
              const fullTask = currentDept.tasks.find(t => t.id === mt.id);
              if (fullTask && fullTask.requiredSkills.some((rs:any) => rs.id === skill.id)) {
                 derived = Math.max(derived, Math.min(skill.level, 2));
              }
           }
           memberScoreSum += derived;
        }
      }
      
      const percentage = maxScore > 0 ? (memberScoreSum / maxScore) * 100 : 0;
      catData[member.id] = parseFloat(percentage.toFixed(1));
    }
    
    // Soll Profil aggregieren
    let targetScoreSum = 0;
    for (const skill of cat.skills) {
       // if skill is required by any targetTask, its target score is its max level
       if (targetRequiredSkills.has(skill.id)) {
          targetScoreSum += Math.min(skill.level, 5);
       }
    }
    const targetPercentage = maxScore > 0 ? (targetScoreSum / maxScore) * 100 : 0;
    catData["targetProfile"] = parseFloat(targetPercentage.toFixed(1));

    // Team Average
    const sumAllMembers = currentDept.members.reduce((acc, m) => acc + (catData[m.id] || 0), 0);
    catData["teamAverage"] = currentDept.members.length > 0 ? parseFloat((sumAllMembers / currentDept.members.length).toFixed(1)) : 0;

    categoryScores.push(catData);
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <p className={styles.kpi}>ANALYTIK</p>
        <h2 className={styles.title}>Kompetenz-Radar: {currentDept.name}</h2>
        <p className={styles.subtitle}>
          Visualisierung des Abdeckungsgrades pro Skill-Kategorie im Zeitverlauf.
        </p>
      </header>

      <div className={styles.card}>
        <RadarClient 
           departmentId={currentDept.id}
           data={categoryScores} 
           members={currentDept.members} 
           snapshots={currentDept.snapshots || []} 
        />
      </div>
    </div>
  );
}
