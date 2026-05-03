"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Check, ChevronDown, ChevronRight } from "lucide-react";
import styles from "./tasksInteractive.module.css";
import { createTask, updateTask, deleteTask, toggleTaskSkill, updateCategory, deleteCategory } from "@/app/actions/tasks";

type TaskInteractiveProps = {
  departmentId: string;
  tasks: any[];
  skillCategories: any[];
  members?: any[];
};

export default function TasksInteractiveClient({ departmentId, tasks: initialTasks, skillCategories, members = [] }: TaskInteractiveProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTasks.length > 0 ? initialTasks[0].id : null);
  const [isMobileViewOpen, setIsMobileViewOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
    setIsMobileViewOpen(true);
  };
  
  const tasksByCategory = tasks.reduce((acc: Record<string, any[]>, t: any) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(tasksByCategory).sort();

  const toggleCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(collapsedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setCollapsedCategories(next);
  };

  const handleCreateCategory = async () => {
    const name = window.prompt("Name der neuen Kategorie:", "Neue Kategorie");
    if (!name || name.trim() === "") return;
    if (categories.includes(name)) return alert("Kategorie existiert bereits.");
    
    // Erstelle einen Dummy-Task, damit die Kategorie im String-basierten System existiert
    const res = await createTask(departmentId, name, "Neue Aufgabe");
    if (res.success && res.task) {
        setTasks([...tasks, { ...res.task, requiredSkills: [] }]);
        setSelectedTaskId(res.task.id);
    }
  };

  const handleEditCategory = async (oldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt(`Kategorie "${oldName}" umbenennen in:`, oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    
    setTasks(tasks.map((t: any) => t.category === oldName ? { ...t, category: newName } : t));
    await updateCategory(departmentId, oldName, newName);
  };

  const handleDeleteCategory = async (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Soll die Kategorie "${category}" mitsamt ALLER Aufgaben gelöscht werden?`)) return;
    
    setTasks(tasks.filter((t: any) => t.category !== category));
    if (selectedTaskId && tasks.find((t: any) => t.id === selectedTaskId)?.category === category) {
      setSelectedTaskId(null);
    }
    await deleteCategory(departmentId, category);
  };

  const handleCreateTask = async (category: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const name = window.prompt("Name der neuen Aufgabe:", "Neue Aufgabe");
    if (!name) return;
    const res = await createTask(departmentId, category, name);
    if (res.success && res.task) {
      setTasks([...tasks, { ...res.task, requiredSkills: [] }]);
      setSelectedTaskId(res.task.id);
    }
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Aufgabe wirklich löschen?")) return;
    setTasks(tasks.filter((t: any) => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    await deleteTask(id);
  };

  const handleToggleSkill = async (taskId: string, skillId: string, isCurrentlyAssigned: boolean) => {
    setTasks(tasks.map((t: any) => {
      if (t.id === taskId) {
        if (isCurrentlyAssigned) {
          return { ...t, requiredSkills: t.requiredSkills.filter((s:any) => s.id !== skillId) };
        } else {
          return { ...t, requiredSkills: [...t.requiredSkills, { id: skillId }] };
        }
      }
      return t;
    }));
    await toggleTaskSkill(taskId, skillId, !isCurrentlyAssigned);
  };

  const handleUpdateName = async (e: React.FocusEvent<HTMLInputElement>, taskId: string) => {
    const newName = e.target.value.trim();
    if (!newName) return;
    setTasks(tasks.map((t: any) => t.id === taskId ? { ...t, name: newName } : t));
    await updateTask(taskId, { name: newName });
  };
  
  const handleUpdateDesc = async (e: React.FocusEvent<HTMLTextAreaElement>, taskId: string) => {
    const newDesc = e.target.value;
    setTasks(tasks.map((t: any) => t.id === taskId ? { ...t, desc: newDesc } : t));
    await updateTask(taskId, { desc: newDesc });
  };

  const selectedTask = tasks.find((t: any) => t.id === selectedTaskId) || null;

  // Calculat Metrics
  let complexityRaw = "0.00";
  let compLevel = "Niedrig";
  let categoryCounts: Record<string, number> = {};
  let qualifiedMembers: any[] = [];
  
  if (selectedTask) {
    let sumLevels = 0;
    const reqSkills = selectedTask.requiredSkills || [];
    
    reqSkills.forEach((rs: any) => {
       for(const cat of skillCategories) {
          const s = cat.skills.find((x: any) => x.id === rs.id);
          if (s) {
            sumLevels += (s.level || 3);
            categoryCounts[cat.name] = (categoryCounts[cat.name] || 0) + 1;
            break;
          }
       }
    });
    
    if (reqSkills.length > 0) {
      complexityRaw = (sumLevels / (reqSkills.length * 5)).toFixed(2);
      const rawNum = parseFloat(complexityRaw);
      if (rawNum > 0.4) compLevel = "Mittel";
      if (rawNum > 0.7) compLevel = "Hoch";
    }

    qualifiedMembers = members.filter((m: any) => 
       m.assignedTasks && m.assignedTasks.some((t: any) => t.id === selectedTask.id)
    );
  }

  const totalCatSkills = Object.values(categoryCounts).reduce((a,b)=>a+b, 0);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Aufgaben-Katalog</h2>
          <button className={styles.addCategoryBtn} onClick={handleCreateCategory} title="Neue Kategorie erstellen">
            <Plus size={16} />
          </button>
        </div>

        <div className={styles.categoryList}>
          {categories.map(cat => {
            const isCollapsed = collapsedCategories.has(cat);
            return (
              <div key={cat} className={styles.categoryGroup}>
                <div className={styles.categoryHeader} onClick={(e) => toggleCategory(cat, e)}>
                  {isCollapsed ? <ChevronRight size={14} className={styles.chevron} /> : <ChevronDown size={14} className={styles.chevron} />}
                  <span className={styles.categoryName}>{cat}</span>
                  
                  <div className={styles.categoryActions}>
                    <button className={styles.iconBtn} onClick={(e) => handleEditCategory(cat, e)}><Edit3 size={12} /></button>
                    <button className={styles.iconBtn} onClick={(e) => handleDeleteCategory(cat, e)}><Trash2 size={12} /></button>
                    <button className={styles.iconBtn} onClick={(e) => handleCreateTask(cat, e)}><Plus size={14} /></button>
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className={styles.taskList}>
                    {(tasksByCategory[cat] as any[]).map((task: any) => (
                      <div 
                        key={task.id} 
                        className={`${styles.taskListItem} ${selectedTaskId === task.id ? styles.taskListItemActive : ""}`}
                        onClick={() => handleSelectTask(task.id)}
                      >
                        <div className={styles.taskListItemDot}></div>
                        <div className={styles.taskListItemContent}>
                          <span className={styles.taskListItemTitle}>{task.name}</span>
                          <span className={styles.taskListItemSubtitle}>
                            {task.requiredSkills?.length || 0} Skills zugewiesen
                          </span>
                        </div>
                        <button 
                          className={styles.deleteBtn}
                          onClick={(e) => handleDeleteTask(task.id, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${styles.mainContent} ${isMobileViewOpen ? styles.mainContentOpen : ""}`}>
        {selectedTask ? (
          <div key={selectedTask.id} className={styles.taskEditor}>
            <div className={styles.taskHeader}>
              <div className={styles.mobileBackRow}>
                 <button className={styles.mobileBackBtn} onClick={() => setIsMobileViewOpen(false)}>
                   <ChevronDown size={20} /> Schliessen
                 </button>
              </div>
              <div className={styles.taskBreadcrumb}>
                <span className={styles.breadcrumbBadge}>{selectedTask.category}</span>
                <span className={styles.breadcrumbBadgeOutline}>Aktive Aufgabe</span>
              </div>
              <input 
                 className={styles.taskTitleInput} 
                 defaultValue={selectedTask.name}
                 onBlur={(e) => handleUpdateName(e, selectedTask.id)}
                 placeholder="Aufgabentitel eingeben"
              />
              <textarea 
                 className={styles.taskDescInput}
                 defaultValue={selectedTask.desc || ""}
                 placeholder="Detaillierte Beschreibung hier hinzufügen..."
                 onBlur={(e) => handleUpdateDesc(e, selectedTask.id)}
              />
            </div>

            <div className={styles.skillsSection}>
              <div className={styles.skillsSectionHeader}>
                <h3 className={styles.skillsSectionTitle}>Benötigte Skills konfigurieren</h3>
                <span className={styles.skillsCount}>
                   <strong style={{color: 'var(--primary)'}}>{selectedTask.requiredSkills?.length || 0} Skills ausgewählt</strong>
                </span>
              </div>

              <div className={styles.skillGridContainer}>
                {skillCategories.map(cat => (
                  <div key={cat.id} className={styles.skillCategoryBlock}>
                    <h4 className={styles.skillCategoryTitle}>{cat.name}</h4>
                    <div className={styles.skillGrid}>
                      {cat.skills.map((skill: any) => {
                        const isAssigned = selectedTask.requiredSkills?.some((rs: any) => rs.id === skill.id) || false;
                        return (
                          <div 
                             key={skill.id} 
                             className={`${styles.skillCard} ${isAssigned ? styles.skillCardActive : ""}`}
                             onClick={() => handleToggleSkill(selectedTask.id, skill.id, isAssigned)}
                          >
                             <div className={styles.checkboxContainer}>
                               <div className={`${styles.checkbox} ${isAssigned ? styles.checkboxChecked : ""}`}>
                                 {isAssigned && <Check size={12} strokeWidth={3} color="white" />}
                               </div>
                             </div>
                             <span className={styles.skillCardName}>{skill.name}</span>
                             <span className={styles.skillLevelBadge}>Level {skill.level}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
           <div className={styles.emptyState}>
             Bitte wählen Sie eine Aufgabe aus der linken Leiste aus.
           </div>
        )}
      </div>

      {/* Metrics Right Sidebar */}
      {selectedTask && (
        <div className={styles.metricsSidebar}>
          <div className={styles.metricsBadge}>Aufgaben-Zusammenfassung</div>
          <h2 className={styles.metricsTitle}>Metriken</h2>

          <div className={styles.metricsGroup}>
            <div className={styles.metricsSubtitle}>Komplexitätsindex</div>
            <div className={styles.complexityRow}>
              <span className={styles.complexityValue}>{complexityRaw}</span>
              <span className={styles.complexityLabel}>/ {compLevel}</span>
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} style={{width: `${parseFloat(complexityRaw) * 100}%`}}></div>
            </div>
          </div>

          <div className={styles.metricsGroup}>
            <div className={styles.metricsSubtitle}>Skill-Verteilung</div>
            {Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts).map(cat => {
              const count = categoryCounts[cat];
              const pct = totalCatSkills ? Math.round((count/totalCatSkills)*100) : 0;
              return (
                <div key={cat} className={styles.skillDistRow}>
                  <span className={styles.skillDistName} title={cat}>{cat}</span>
                  <span>{pct}%</span>
                </div>
              );
            }) : (
              <div className={styles.skillDistRow} style={{color: 'var(--on-surface-variant)', fontWeight: 'normal'}}>
                Keine Skills zugewiesen
              </div>
            )}
          </div>

          <div className={styles.metricsGroup}>
            <div className={styles.metricsSubtitle}>Qualifizierte Rollen</div>
            <div className={styles.avatarsRow}>
              {qualifiedMembers.slice(0,4).map((m, i) => (
                <div key={m.id} className={styles.metricsAvatar} style={{backgroundColor: m.color || "var(--primary)", zIndex: 10-i}}>
                  {m.short}
                </div>
              ))}
              {qualifiedMembers.length > 4 && (
                <div className={styles.metricsAvatar} style={{backgroundColor: "var(--on-surface-variant)", zIndex: 0}}>
                  +{qualifiedMembers.length - 4}
                </div>
              )}
            </div>
            {qualifiedMembers.length === 0 ? (
               <div className={styles.avatarsHint}>Derzeit keine verknüpften Mitarbeiter.</div>
            ) : (
               <div className={styles.avatarsHint}>Derzeit für diese Aufgabe konfigurierte Mitarbeiter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
