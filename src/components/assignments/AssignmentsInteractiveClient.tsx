"use client";

import React, { useState, useEffect } from "react";
import { Check, Key, Plus, X, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./assignmentsInteractive.module.css";
import { toggleMemberTask } from "@/app/actions/tasks";
import { saveTeamMembers, MemberDraft } from "@/app/actions/members";

type AssignmentsInteractiveProps = {
  departmentId: string;
  members: any[];
  tasks: any[];
};

export default function AssignmentsInteractiveClient({ departmentId, members: initialMembers, tasks }: AssignmentsInteractiveProps) {
  const [members, setMembers] = useState(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMembers[0]?.id || null);

  useEffect(() => {
    setMembers(initialMembers);
    if (!initialMembers.find(m => m.id === selectedMemberId)) {
        setSelectedMemberId(initialMembers[0]?.id || null);
    }
  }, [initialMembers]);

  const selectedMember = members.find(m => m.id === selectedMemberId) || null;

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(tasksByCategory).sort();

  const handleToggleAssignment = async (taskId: string, isAssigned: boolean) => {
    if (!selectedMemberId) return;
    
    // Optimistic UI Update
    setMembers(members.map(m => {
      if (m.id === selectedMemberId) {
        const currentTasks = m.assignedTasks || [];
        if (isAssigned) {
          return { ...m, assignedTasks: currentTasks.filter((t:any) => t.id !== taskId) };
        } else {
          return { ...m, assignedTasks: [...currentTasks, { id: taskId }] };
        }
      }
      return m;
    }));

    await toggleMemberTask(selectedMemberId, taskId, !isAssigned);
  };

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [draftMembers, setDraftMembers] = useState<MemberDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const openManageModal = () => {
    setDraftMembers(members.map(m => ({
      id: m.id,
      name: m.name,
      short: m.short,
      title: m.title || "",
      color: m.color || "#D30018",
    })));
    setIsManageModalOpen(true);
  };

  const handleAddDraftMember = () => {
    const colors = ["#2563eb", "#ea580c", "#16a34a", "#dc2626", "#9333ea", "#9f1239"];
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    setDraftMembers([...draftMembers, {
      id: "new-" + Date.now(),
      name: "",
      short: "",
      title: "",
      color: randColor,
    }]);
  };

  const updateDraftMember = (id: string, field: keyof MemberDraft, value: string | boolean) => {
    setDraftMembers(draftMembers.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const router = useRouter();

  const handleSaveTeam = async () => {
    setIsSaving(true);
    const validMembers = draftMembers.filter(m => m.name.trim() !== ""); // Basic validation
    const res = await saveTeamMembers(departmentId, validMembers);
    if (res.success) {
      setIsManageModalOpen(false);
      // Let the server fetch the real IDs and new data
      router.refresh();
      // Since router.refresh is async, the props will update soon.
      // But until then, we shouldn't use the fake 'new-' IDs for interactions.
      // Easiest is just waiting for the page to remount/props to change.
    } else {
      alert("Fehler beim Speichern: " + res.error);
    }
    setIsSaving(false);
  };

  return (
    <div className={styles.container}>
      {/* Left Sidebar */}
      <div className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Personal</h2>
        <p className={styles.sidebarSubtitle}>{members.length} Teammitglieder gefunden</p>
        
        <div className={styles.memberList}>
          {members.map(member => {
            const isActive = selectedMemberId === member.id;
            return (
              <div 
                key={member.id} 
                className={`${styles.memberCard} ${isActive ? styles.memberCardActive : ""}`}
                onClick={() => setSelectedMemberId(member.id)}
              >
                <div className={styles.memberAvatar} style={{ backgroundColor: member.color || "var(--primary)" }}>
                  {member.short}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.name}</span>
                  <span className={styles.memberRole}>{member.title || "Mitarbeiter"}</span>
                </div>
                
                {isActive && (
                  <div className={styles.activeCheckIcon}>
                    <Check size={10} strokeWidth={4} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className={styles.manageTeamBtn} onClick={openManageModal}>
          Team verwalten
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {selectedMember ? (
          <div className={styles.categoriesContainer}>
            <div className={styles.headerContainer}>
              <span className={styles.headerSubtitle}>AUFGABEN-ZUWEISUNG</span>
              <h1 className={styles.headerTitle}>Aktive Matrix: {selectedMember.name}</h1>
            </div>

            {categories.map((cat, index) => {
              const catTasks = tasksByCategory[cat];
              const assignedTasksInCat = catTasks.filter((t: any) => selectedMember.assignedTasks?.some((mTask: any) => mTask.id === t.id));

              return (
                <div key={cat} className={styles.categorySection}>
                  <h3 className={styles.categoryTitle}>
                    {cat}
                    <span className={styles.taskCountBadge}>{catTasks.length} AUFGABEN</span>
                  </h3>
                  
                  <div className={styles.cardsGrid}>
                    {index === 0 && (
                       <div className={styles.capacityCard}>
                         <div className={styles.capacitySubtitle}>AUSLASTUNGS-SNAPSHOT</div>
                         <h4 className={styles.capacityTitle}>{selectedMember.name}'s Kapazität</h4>
                         <div className={styles.capacityValue}>
                           100% <span className={styles.capacityUnit}>Auslastung</span>
                         </div>
                         <div className={styles.capacityBarContainer}>
                           <div className={styles.capacityBarFill} style={{ width: '100%' }}></div>
                         </div>
                       </div>
                    )}

                    {catTasks.map((task: any) => {
                      const isAssigned = selectedMember.assignedTasks?.some((mTask: any) => mTask.id === task.id) || false;
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`${styles.taskCard} ${isAssigned ? styles.taskCardActive : ""}`}
                          onClick={() => handleToggleAssignment(task.id, isAssigned)}
                        >
                          <div className={styles.taskCardHeader}>
                            <Key size={16} className={styles.keyIcon} />
                            <div className={`${styles.checkbox} ${isAssigned ? styles.checkboxChecked : ""}`}>
                              {isAssigned && <Check size={12} strokeWidth={3} color="white" />}
                            </div>
                          </div>
                          <h4 className={styles.taskTitle}>{task.name}</h4>
                          <p className={styles.taskDesc}>
                             {task.desc || "Keine detaillierte Beschreibung hinterlegt."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ margin: "auto", fontStyle: "italic", color: "var(--on-surface-variant)" }}>
            Bitte wählen Sie einen Mitarbeiter aus.
          </div>
        )}
      </div>

      {/* Manage Team Modal */}
      {isManageModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBox}>
                <h2>Team verwalten</h2>
                <p>Mitarbeiter hinzufügen, umbenennen oder Rollen zuweisen.</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsManageModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {draftMembers.map(m => (
                <div key={m.id} className={`${styles.editRow} ${m._deleted ? styles.editRowDeleted : ""}`}>
                  <div className={styles.memberAvatar} style={{ backgroundColor: m.color }}>
                    {m.short || "?"}
                  </div>
                  
                  <input 
                    className={styles.modalInput} 
                    placeholder="Name des Mitarbeiters"
                    value={m.name} 
                    onChange={e => updateDraftMember(m.id, "name", e.target.value)}
                    disabled={m._deleted}
                  />
                  
                  <input 
                    className={styles.modalInput} 
                    placeholder="Rolle / Jobtitel"
                    value={m.title} 
                    onChange={e => updateDraftMember(m.id, "title", e.target.value)}
                    disabled={m._deleted}
                  />
                  
                  <input 
                    className={`${styles.modalInput} ${styles.modalInputShort}`}
                    placeholder="Kürzel"
                    value={m.short} 
                    onChange={e => updateDraftMember(m.id, "short", e.target.value)}
                    disabled={m._deleted}
                    maxLength={3}
                  />
                  
                  <input 
                    type="color"
                    className={styles.colorPickerBox}
                    value={m.color}
                    onChange={e => updateDraftMember(m.id, "color", e.target.value)}
                    disabled={m._deleted}
                  />
                  
                  <button 
                    className={styles.trashBtn} 
                    onClick={() => updateDraftMember(m.id, "_deleted", !m._deleted)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className={styles.modalFooter}>
              <button className={styles.addBtnText} onClick={handleAddDraftMember}>
                <Plus size={16} /> Mitarbeiter hinzufügen
              </button>
              
              <div className={styles.footerActions}>
                <button className={styles.cancelBtn} onClick={() => setIsManageModalOpen(false)}>
                  Abbrechen
                </button>
                <button className={styles.saveBtn} onClick={handleSaveTeam} disabled={isSaving}>
                  {isSaving ? "Lädt..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
