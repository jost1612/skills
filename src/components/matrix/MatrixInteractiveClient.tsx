"use client";

import React, { useState, useEffect } from "react";
import styles from "./matrixInteractive.module.css";
import { updateSkillScore, updateSkillInterest, moveSkillToCategory } from "@/app/actions/skills";
import { toggleMemberTask } from "@/app/actions/tasks";
import { ChevronRight, ChevronDown, GripVertical } from "lucide-react";

type MatrixInteractiveProps = {
  departmentId: string;
  departmentName: string;
  members: any[];
  skillCategories: any[];
  tasks: any[];
};

export default function MatrixInteractiveClient({ departmentId, departmentName, members, skillCategories, tasks }: MatrixInteractiveProps) {
  const [viewMode, setViewMode] = useState<"categories" | "tasks">("categories");
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  // Track assigned tasks optimistic updates mapping memberId -> Set<taskId>
  const [localAssignedTasks, setLocalAssignedTasks] = useState<Record<string, Set<string>>>(() => {
     const init: Record<string, Set<string>> = {};
     members.forEach(m => {
        init[m.id] = new Set(m.assignedTasks?.map((t:any) => t.id) || []);
     });
     return init;
  });

  const toggleTaskAssign = async (memberId: string, taskId: string) => {
     const currentSet = localAssignedTasks[memberId] || new Set();
     const assign = !currentSet.has(taskId);
     
     // Optimistic
     setLocalAssignedTasks(prev => {
        const next = new Set(prev[memberId] || []);
        if (assign) next.add(taskId);
        else next.delete(taskId);
        return { ...prev, [memberId]: next };
     });

     await toggleMemberTask(memberId, taskId, assign);
  };
  
  // Collapse/Expand state for categories (matching legacy)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    skillCategories.forEach(cat => init[cat.id] = true);
    return init;
  });

  // Local copy of categories to allow optimistic drag and drop
  const [localCategories, setLocalCategories] = useState(skillCategories);

  // Sync when props change (e.g. from server action)
  useEffect(() => {
    setLocalCategories(skillCategories);
  }, [skillCategories]);

  // Map scores by `${memberId}_${skillId}`
  const [localScores, setLocalScores] = useState<Record<string, number>>(() => {
    const scores: Record<string, number> = {};
    skillCategories.forEach(cat => {
      cat.skills.forEach((skill: any) => {
        skill.scores?.forEach((scoreObj: any) => {
          scores[`${scoreObj.memberId}_${skill.id}`] = scoreObj.score;
        });
      });
    });
    return scores;
  });

  const [localInterests, setLocalInterests] = useState<Record<string, number>>(() => {
    const interests: Record<string, number> = {};
    skillCategories.forEach(cat => {
      cat.skills.forEach((skill: any) => {
        skill.scores?.forEach((scoreObj: any) => {
          if (scoreObj.interest !== undefined) {
             interests[`${scoreObj.memberId}_${skill.id}`] = scoreObj.interest;
          }
        });
      });
    });
    return interests;
  });

  const [matrixViewMode, setMatrixViewMode] = useState<"skill" | "interest">("skill");

  const [draggedSkill, setDraggedSkill] = useState<{ id: string; categoryId: string } | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  const getEffectiveScore = (memberId: string, skillId: string) => {
    let rawScore = localScores[`${memberId}_${skillId}`];
    
    // Check derived score from assigned tasks
    let derivedScore = 0;
    const assignedTaskIds = localAssignedTasks[memberId] || new Set();
    
    Array.from(assignedTaskIds).forEach((taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.requiredSkills?.some((rs: any) => rs.id === skillId)) {
        for (const cat of localCategories) {
          const s = cat.skills.find((x: any) => x.id === skillId);
          if (s && s.level > derivedScore) {
            derivedScore = Math.min(s.level, 2);
          }
        }
      }
    });

    const isExplicitlySet = rawScore !== undefined && rawScore !== -1;
    const isDerived = !isExplicitlySet && derivedScore > 0;
    const finalScore = isExplicitlySet ? rawScore : derivedScore;

    return { score: finalScore, isDerived, derivedScore };
  };

  const getInterestScore = (memberId: string, skillId: string) => {
    return localInterests[`${memberId}_${skillId}`] || 0;
  };

  const handleScoreClick = async (memberId: string, skillId: string, currentScore: number) => {
    // Cycle 0 -> 1 -> 2 -> 3 -> 0
    const newScore = currentScore >= 3 ? 0 : currentScore + 1;
    
    if (matrixViewMode === "interest") {
       setLocalInterests(prev => ({ ...prev, [`${memberId}_${skillId}`]: newScore }));
       await updateSkillInterest(memberId, skillId, newScore);
       return;
    }

    // What actual value do we save to DB?
    // If we clicked to match the derivedScore exactly, we can remove the override (send -1).
    // Or if derivedScore is 0 and we clicked to 0, we can also remove the override.
    // Wait, let's just implement Legacy logic:
    const { derivedScore } = getEffectiveScore(memberId, skillId);
    let scoreToSave = (newScore === derivedScore) ? -1 : newScore;
    
    // Optimistic Update
    setLocalScores(prev => {
      const next = { ...prev };
      if (scoreToSave === -1) {
        delete next[`${memberId}_${skillId}`];
      } else {
        next[`${memberId}_${skillId}`] = scoreToSave;
      }
      return next;
    });

    await updateSkillScore(memberId, skillId, scoreToSave);
  };

  const toggleCatExpand = (catId: string) => {
    setExpandedCats(p => ({ ...p, [catId]: !p[catId] }));
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(p => ({ ...p, [taskId]: !p[taskId] }));
  };

  const handleDragStart = (e: React.DragEvent, skillId: string, categoryId: string) => {
    setDraggedSkill({ id: skillId, categoryId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault(); // Necessary to allow dropping
    if (dragOverCatId !== categoryId) {
       setDragOverCatId(categoryId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverCatId(null);
    if (!draggedSkill) return;
    if (draggedSkill.categoryId === targetCategoryId) return; // Same category, do nothing (order not implemented)

    // Optimistic UI update
    const sourceCatIndex = localCategories.findIndex(c => c.id === draggedSkill.categoryId);
    const targetCatIndex = localCategories.findIndex(c => c.id === targetCategoryId);
    
    if (sourceCatIndex > -1 && targetCatIndex > -1) {
       const newCats = [...localCategories];
       const skillToMove = newCats[sourceCatIndex].skills.find((s: any) => s.id === draggedSkill.id);
       
       newCats[sourceCatIndex] = {
          ...newCats[sourceCatIndex],
          skills: newCats[sourceCatIndex].skills.filter((s:any) => s.id !== draggedSkill.id)
       };
       
       if (skillToMove) {
          newCats[targetCatIndex] = {
             ...newCats[targetCatIndex],
             skills: [...newCats[targetCatIndex].skills, { ...skillToMove, categoryId: targetCategoryId }]
          };
       }
       setLocalCategories(newCats);
       
       // Server sync
       await moveSkillToCategory(draggedSkill.id, targetCategoryId);
    }
    
    setDraggedSkill(null);
  };

  // The custom MatrixDot component to exactly mirror legacy
  const MatrixDot = ({ score, isDerived, derivedScore, mode }: { score: number, isDerived: boolean, derivedScore: number, mode: "skill" | "interest" }) => {
    if (mode === "interest") {
      const StarItem = ({ color }: { color: string }) => (
         <div style={{ color }}>★</div>
      );
      let content;
      if (score === 0) content = <div style={{ opacity: 0 }}>★</div>; // invisible placeholder
      else if (score === 1) content = <span style={{ color: '#9ca3af', fontSize: '14px' }}>★</span>;
      else if (score === 2) content = <span style={{ color: '#fbbf24', fontSize: '14px' }}>★★</span>;
      else content = <span style={{ color: '#f59e0b', fontSize: '14px' }}>★★★</span>;

      return (
        <div className={styles.dotWrapper}>
          {content}
        </div>
      );
    }

    const taskRequires = derivedScore > 0;
    const marker = (isDerived && score > 0) ? <div className={styles.dotMarkerA}>E</div> : null; // E for Expert/Experience or A for Abgeleitet
    const gap = (!isDerived && taskRequires && score < derivedScore) ? <div className={styles.dotMarkerRed}></div> : null;

    let dot;
    if (score === 0) {
        dot = <div className={styles.dotLevel0}></div>; 
    } else if (score === 1) {
        dot = <div className={styles.dotLevel1} title="Basis"></div>;
    } else if (score === 2) {
        dot = <div className={styles.dotLevel2} title="Standard"></div>;
    } else {
        dot = (
            <div className={styles.dotLevel3} title="Expert">
              <div className={styles.dotLevel3Inner}></div>
            </div>
        );
    }

    return (
      <div className={styles.dotWrapper}>
        {dot}
        {marker}
        {gap}
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className={styles.viewToggleGroup}>
             <button 
                onClick={() => setMatrixViewMode("skill")} 
                className={`${styles.viewToggleBtn} ${matrixViewMode === "skill" ? styles.viewToggleBtnActive : ""}`}
             >
               Können
             </button>
             <button 
                onClick={() => setMatrixViewMode("interest")} 
                className={`${styles.viewToggleBtn} ${matrixViewMode === "interest" ? styles.viewToggleBtnActive : ""}`}
             >
               Lernbereitschaft
             </button>
          </div>
          <div className={styles.viewToggleGroup}>
             <button 
                onClick={() => setViewMode("categories")} 
                className={`${styles.viewToggleBtn} ${viewMode === "categories" ? styles.viewToggleBtnActive : ""}`}
             >
               Nach Kategorien
             </button>
             <button 
                onClick={() => setViewMode("tasks")} 
                className={`${styles.viewToggleBtn} ${viewMode === "tasks" ? styles.viewToggleBtnActive : ""}`}
             >
               Nach Aufgaben
             </button>
          </div>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.legendBar}>
           <div className={styles.legendItem}>
              <div className={styles.dotLevel0}></div><span>Level 0 (Keine Zuweisung)</span>
           </div>
           <div className={styles.legendItem}>
              <div className={styles.dotLevel1}></div><span>Level 1 (Basis)</span>
           </div>
           <div className={styles.legendItem}>
              <div className={styles.dotLevel2}></div><span>Level 2 (Standard)</span>
           </div>
           <div className={styles.legendItem}>
              <div className={styles.dotLevel3}>
                <div className={styles.dotLevel3Inner}></div>
              </div>
              <span>Level 3 (Experte)</span>
           </div>
           <div className={styles.legendItem}>
              <div className={styles.dotWrapper} style={{ transform: 'none' }}>
                <div className={styles.dotLevel2}></div>
                <div className={styles.dotMarkerA} style={{ position: 'relative', top: 0, right: 0, marginLeft: 2 }}>E</div>
              </div>
              <span>Abgeleitet durch Prozess-Zuweisung</span>
           </div>
           <div className={styles.legendItem}>
              <div className={styles.dotWrapper} style={{ transform: 'none' }}>
                <div className={styles.dotLevel1}></div>
                <div className={styles.dotMarkerRed} style={{ position: 'relative', right: 0, marginLeft: 4 }}></div>
              </div>
              <span style={{ color: '#D30018', fontWeight: 700 }}>Skill-Gap (Process erfordert höheres Level)</span>
           </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCategories}>
                  <div style={{color: "var(--primary)", fontSize: "0.75rem", letterSpacing: "0.1em", fontWeight: 700}}>
                    {viewMode === "categories" ? "SKILL KATEGORIEN" : "AUFGABEN-VERTEILUNG"}
                  </div>
                </th>
                {members.map(m => (
                  <th key={m.id} className={styles.thMember}>
                    <div className={styles.memberAvatar} style={{ backgroundColor: m.color || "var(--primary)" }}>
                      {m.short}
                    </div>
                    <span className={styles.memberName} title={m.name}>{m.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            
            {viewMode === "categories" && localCategories.map(cat => (
              <tbody 
                 key={cat.id}
                 onDragOver={(e) => handleDragOver(e, cat.id)}
                 onDrop={(e) => handleDrop(e, cat.id)}
              >
                <tr className={`${styles.categoryHeaderRow} ${dragOverCatId === cat.id ? styles.categoryHeaderRowDragOver : ""}`}>
                  <td colSpan={members.length + 1} onClick={() => toggleCatExpand(cat.id)} className={styles.categoryHeaderCell}>
                    <div className={styles.categoryHeaderInner}>
                       {expandedCats[cat.id] ? <ChevronDown size={14} className={styles.chevronPrimary}/> : <ChevronRight size={14} className={styles.chevronPrimary}/>}
                       <span>{cat.name.toUpperCase()}</span>
                    </div>
                  </td>
                </tr>
                {expandedCats[cat.id] && cat.skills.map((skill: any) => (
                  <tr 
                     key={skill.id} 
                     className={`${styles.skillRow} ${draggedSkill?.id === skill.id ? styles.skillRowDragging : ""}`}
                     draggable
                     onDragStart={(e) => handleDragStart(e, skill.id, cat.id)}
                     onDragEnd={() => { setDraggedSkill(null); setDragOverCatId(null); }}
                  >
                    <td className={styles.skillNameCell}>
                      <div className={styles.skillNameInner}>
                         <GripVertical size={14} className={styles.gripIcon} />
                         <span>{skill.name}</span>
                      </div>
                    </td>
                    {members.map(m => {
                      const { score, isDerived, derivedScore } = getEffectiveScore(m.id, skill.id);
                      const interestScore = getInterestScore(m.id, skill.id);
                      const scoreToPass = matrixViewMode === "interest" ? interestScore : score;
                      const clickScore = matrixViewMode === "interest" ? interestScore : score;

                      return (
                        <td 
                           key={m.id} 
                           className={styles.scoreCell}
                           onClick={() => handleScoreClick(m.id, skill.id, clickScore)}
                           style={{ cursor: "pointer" }}
                        >
                           <MatrixDot 
                              score={scoreToPass} 
                              mode={matrixViewMode}
                              isDerived={isDerived} 
                              derivedScore={derivedScore}
                           />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}

            {viewMode === "tasks" && Object.entries(
               tasks.reduce((acc: Record<string, any[]>, t: any) => {
                  if (!acc[t.category]) acc[t.category] = [];
                  acc[t.category].push(t);
                  return acc;
               }, {} as Record<string, any[]>)
            ).map(([catName, tasksInCat]) => {
              return (
                <tbody key={catName}>
                  <tr className={styles.categoryHeaderRow}>
                    <td colSpan={members.length + 1} className={styles.categoryHeaderCell} style={{ backgroundColor: "var(--surface-container-low)" }}>
                       <div className={styles.categoryHeaderInner}>
                         <span style={{ color: "var(--primary)", fontWeight: 800, letterSpacing: "0.05em" }}>{catName.toUpperCase()}</span>
                       </div>
                    </td>
                  </tr>
                  
                  {(tasksInCat as any[]).map((task: any) => {
                     const isExpanded = expandedTasks[task.id];
                     return (
                       <React.Fragment key={task.id}>
                         <tr className={styles.skillRow} style={{ borderBottom: "1px solid var(--surface-container-high)" }}>
                           <td onClick={() => toggleTaskExpand(task.id)} className={styles.skillNameCell} style={{ cursor: "pointer", paddingLeft: "1.5rem" }}>
                              <div className={styles.skillNameInner}>
                                {isExpanded ? <ChevronDown size={14} className={styles.chevronIcon}/> : <ChevronRight size={14} className={styles.chevronIcon}/>}
                                <span style={{color: "var(--on-surface)", fontWeight: 600}}>{task.name}</span>
                              </div>
                           </td>
                           {members.map(m => {
                              const hasTask = localAssignedTasks[m.id]?.has(task.id);
                              return (
                                <td key={m.id} className={styles.scoreCell}>
                                  <div 
                                     className={`${styles.taskCheckbox} ${hasTask ? styles.taskCheckboxActive : ""}`}
                                     style={{ borderColor: m.color || "var(--primary)", backgroundColor: hasTask ? (m.color || "var(--primary)") : "transparent" }}
                                     onClick={() => toggleTaskAssign(m.id, task.id)}
                                  >
                                     {hasTask && <svg viewBox="0 0 14 14" width="10" height="10" stroke="white" strokeWidth={3} fill="none"><path d="M3 7l2 2 4-4"/></svg>}
                                  </div>
                                </td>
                              );
                           })}
                         </tr>
                         
                         {isExpanded && task.requiredSkills?.map((rs: any) => {
                            let fullSkill: any = null;
                            for (const c of localCategories) {
                               const hit = c.skills.find((s:any) => s.id === rs.id);
                               if (hit) fullSkill = hit;
                            }
                            if (!fullSkill) return null;

                            return (
                               <tr key={fullSkill.id} className={styles.subSkillRow}>
                                 <td className={styles.skillNameCell} style={{ paddingLeft: "3rem" }}>
                                    <div className={styles.subSkillLine}></div>
                                    <span className={styles.subSkillName}>{fullSkill.name}</span>
                                 </td>
                                 {members.map(m => {
                                   const { score, isDerived, derivedScore } = getEffectiveScore(m.id, fullSkill.id);
                                   const interestScore = getInterestScore(m.id, fullSkill.id);
                                   const scoreToPass = matrixViewMode === "interest" ? interestScore : score;
                                   const clickScore = matrixViewMode === "interest" ? interestScore : score;

                                   return (
                                     <td 
                                        key={m.id} 
                                        className={styles.scoreCell}
                                        onClick={() => handleScoreClick(m.id, fullSkill.id, clickScore)}
                                        style={{ cursor: "pointer", padding: "0.25rem 0" }}
                                     >
                                       <MatrixDot 
                                          score={scoreToPass} 
                                          mode={matrixViewMode}
                                          isDerived={isDerived} 
                                          derivedScore={derivedScore}
                                       />
                                     </td>
                                   );
                                 })}
                               </tr>
                            );
                         })}
                       </React.Fragment>
                     );
                  })}
                </tbody>
              );
            })}

          </table>
        </div>
      </div>
    </div>
  );
}
