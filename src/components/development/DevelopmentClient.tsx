"use client";

import React, { useState } from "react";
import styles from "./development.module.css";
import { UserPlus, Settings, FileCheck, Target, TrendingUp, X } from "lucide-react";
import { addCertificate, deleteCertificate, addTrainingGoal, updateTrainingGoalStatus, deleteTrainingGoal } from "@/app/actions/development";
import { toggleMemberTask } from "@/app/actions/tasks";

type Member = any;
type Props = {
  department: any;
  members: Member[];
  tasks: any[];
  skillCategories: any[];
}

export default function DevelopmentClient({ department, members, tasks, skillCategories }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(members[0]?.id || null);
  const [activeTab, setActiveTab] = useState<"gap" | "ziele" | "zertifikate" | "willskill">("gap");

  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");

  const selectedMember = members.find((m: any) => m.id === selectedMemberId);

  if (!selectedMember) return <div>Keine Mitarbeiter vorhanden.</div>;

  // Derivation Logic for GAP based on MEMBER's Assigned Tasks
  const targetRequiredSkills = new Map<string, number>();
  if (selectedMember.assignedTasks) {
     for (const at of selectedMember.assignedTasks) {
        const fullTask = tasks.find((t: any) => t.id === at.id);
        if (fullTask && fullTask.requiredSkills) {
           for (const rs of fullTask.requiredSkills) {
              targetRequiredSkills.set(rs.id, 5); // default max level required by this role
           }
        }
     }
  }

  // Local function to get effective score for the member matching the Matrix logic
  const getEffectiveScore = (skillId: string) => {
     let rawScore = -1;
     let interest = 0;
     const scoreObj = (selectedMember.skillScores || []).find((s:any) => s.skillId === skillId);
     if (scoreObj) {
         rawScore = scoreObj.score;
         interest = scoreObj.interest || 0;
     }

     let derivedScore = 0;
     if (selectedMember.assignedTasks) {
        for (const at of selectedMember.assignedTasks) {
           const t = tasks.find((x: any) => x.id === at.id);
           if (t && t.requiredSkills?.some((rs:any) => rs.id === skillId)) {
               let sLevel = 3;
               for (const c of skillCategories) {
                  const s = c.skills.find((x:any) => x.id === skillId);
                  if (s) sLevel = Math.min(s.level, 2);
               }
               derivedScore = Math.max(derivedScore, sLevel);
           }
        }
     }

     const isExplicitlySet = rawScore !== -1;
     const finalScore = isExplicitlySet ? rawScore : derivedScore;

     return { score: finalScore, interest };
  };

  const gaps: any[] = [];
  skillCategories.forEach((cat: any) => {
    cat.skills.forEach((skill: any) => {
       if (targetRequiredSkills.has(skill.id)) {
           const requiredLevel = Math.min(skill.level, 3);
           const { score, interest } = getEffectiveScore(skill.id);
           const isGap = score < requiredLevel;
           gaps.push({
               requiredLevel,
               categoryName: cat.name,
               skillName: skill.name,
               skillId: skill.id,
               currentScore: score,
               isGap,
               interest
           });
       }
    });
  });

  const renderDots = (score: number, max: number = 3) => {
      return Array(max).fill(0).map((_, i) => (
         <div key={i} className={i < score ? styles.dotFilled : styles.dotEmpty}></div>
      ));
  };

  const handleCreateGoalObj = async (skillId: string, level: number) => {
      if (!selectedMemberId) return;
      await addTrainingGoal({ memberId: selectedMemberId, skillId, targetLevel: level });
  };

  const handleAddCert = async () => {
      if (!newCertName || !selectedMemberId) return;
      await addCertificate({ memberId: selectedMemberId, name: newCertName, issuer: newCertIssuer });
      setNewCertName("");
      setNewCertIssuer("");
  };

  const allSkillsRaw: any[] = [];
  skillCategories.forEach((cat: any) => {
    cat.skills.forEach((skill: any) => {
       const { score, interest } = getEffectiveScore(skill.id);
       if (score > 0 || interest > 0) {
          allSkillsRaw.push({ skillName: skill.name, score, interest, isTarget: targetRequiredSkills.has(skill.id) });
       }
    });
  });

  // Group into 4 quadrants
  const potentialSkills = allSkillsRaw.filter((s: any) => s.score <= 1 && s.interest >= 2);
  const starSkills = allSkillsRaw.filter((s: any) => s.score >= 2 && s.interest >= 2);
  const deadWoodSkills = allSkillsRaw.filter((s: any) => s.score <= 1 && s.interest <= 1);
  const workhorseSkills = allSkillsRaw.filter((s: any) => s.score >= 2 && s.interest <= 1);

  return (
    <div className={styles.container}>
      {/* Sidebar Members */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
           <h3>Team ({members.length})</h3>
        </div>
        <div className={styles.memberList}>
          {members.map((m: any) => (
             <button 
                key={m.id} 
                className={`${styles.memberCard} ${selectedMemberId === m.id ? styles.memberCardActive : ""}`}
                style={{ borderLeftColor: m.color || "var(--primary)" }}
                onClick={() => setSelectedMemberId(m.id)}
             >
                <div className={styles.avatar} style={{ backgroundColor: m.color || "var(--primary)" }}>{m.short}</div>
                <div className={styles.memberInfo}>
                  <p className={styles.memberName}>{m.name}</p>
                  <p className={styles.memberTitle}>{m.title || "Mitarbeiter"}</p>
                </div>
             </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.header}>
            <div className={styles.headerTitleArea}>
                <div className={styles.avatarLarge} style={{ backgroundColor: selectedMember.color || "var(--primary)" }}>
                   {selectedMember.short}
                </div>
                <div>
                   <h2>{selectedMember.name}</h2>
                   <p>{selectedMember.title || "Teammitglied"}</p>
                </div>
            </div>
            
            <div className={styles.tabs}>
                <button className={`${styles.tab} ${activeTab === "gap" ? styles.tabActive : ""}`} onClick={() => setActiveTab("gap")}>
                    <TrendingUp size={16} /> Ist-Soll Abgleich
                </button>
                <button className={`${styles.tab} ${activeTab === "ziele" ? styles.tabActive : ""}`} onClick={() => setActiveTab("ziele")}>
                    <Target size={16} /> Trainingsziele ({selectedMember.trainingGoals?.length || 0})
                </button>
                <button className={`${styles.tab} ${activeTab === "zertifikate" ? styles.tabActive : ""}`} onClick={() => setActiveTab("zertifikate")}>
                    <FileCheck size={16} /> Nachweise ({selectedMember.certificates?.length || 0})
                </button>
                <button className={`${styles.tab} ${activeTab === "willskill" ? styles.tabActive : ""}`} onClick={() => setActiveTab("willskill")}>
                    <TrendingUp size={16} /> Will-Skill
                </button>
            </div>
        </div>

        <div className={styles.contentArea}>
            {activeTab === "gap" && (
                <>
                <div className={styles.card} style={{ marginBottom: "2rem" }}>
                   <h3 style={{ marginBottom: "1rem" }}>Aufgaben & Rollen (Soll-Profil)</h3>
                   <p style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)", marginBottom: "1rem" }}>
                     Wähle aus, welche Rollen und Aufgabenbereiche {selectedMember.name} zugewiesen sind. 
                     Dies generiert das individuelle Soll-Profil für den Ist-Soll Abgleich.
                   </p>
                   <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      {tasks.map((t: any) => {
                         const isAssigned = (selectedMember.assignedTasks || []).some((at:any) => at.id === t.id);
                         return (
                            <label key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "1px solid var(--surface-container-high)", borderRadius: "8px", cursor: "pointer", background: isAssigned ? "var(--primary-container)" : "var(--surface)" }}>
                               <input 
                                 type="checkbox" 
                                 checked={isAssigned}
                                 onChange={() => toggleMemberTask(selectedMemberId!, t.id, !isAssigned)}
                               />
                               <span style={{ fontSize: "0.85rem", fontWeight: isAssigned ? 700 : 500, color: isAssigned ? "var(--on-primary-container)" : "var(--on-surface)" }}>
                                 {t.name}
                               </span>
                            </label>
                         );
                      })}
                   </div>
                </div>

                <div className={styles.card}>
                   <h3 style={{ marginBottom: "1rem" }}>Ist-Soll Abgleich</h3>
                   <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {gaps.sort((a: any, b: any) => b.isGap ? 1 : -1).map((g: any) => (
                         <div key={g.skillId} className={styles.gapRow} style={{ borderLeftColor: g.isGap ? "#D30018" : "#10B981" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>{g.categoryName}</p>
                                <p style={{ fontWeight: 600 }}>{g.skillName}</p>
                            </div>
                            <div style={{ width: "120px" }}>
                                <p style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)", marginBottom: "4px" }}>IST / SOLL</p>
                                <div style={{ display: "flex", gap: "2px" }}>
                                   {renderDots(g.currentScore)} <span style={{ margin: "0 8px", color: "#9ca3af" }}>/</span> {renderDots(g.requiredLevel)}
                                </div>
                            </div>
                            <div style={{ width: "180px", textAlign: "right" }}>
                               {g.isGap ? (
                                  <button onClick={() => handleCreateGoalObj(g.skillId, g.requiredLevel)} className={styles.btnAction}>Als Ziel setzen</button>
                               ) : (
                                  <span style={{ fontSize: "0.85rem", color: "#10B981", fontWeight: 600 }}>Erfüllt</span>
                               )}
                            </div>
                         </div>
                      ))}
                      {gaps.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)" }}>Keine Aufgaben/Rollen zugewiesen, daher kein Soll-Profil definiert.</p>}
                   </div>
                </div>
                </>
             )}

             {activeTab === "ziele" && (
                <div className={styles.card}>
                   <h3 style={{ marginBottom: "1rem" }}>Aktuelle Trainingsziele</h3>
                   {selectedMember.trainingGoals && selectedMember.trainingGoals.length > 0 ? (
                       <div className={styles.grid}>
                          {selectedMember.trainingGoals.map((tg:any) => {
                             const skillName = skillCategories.flatMap(c=>c.skills).find(s=>s.id === tg.skillId)?.name || "Unbekannt";
                             return (
                                 <div key={tg.id} className={styles.goalCard}>
                                    <div>
                                       <span className={styles.badge}>{tg.status === "COMPLETED" ? "Abgeschlossen" : "In Arbeit"}</span>
                                    </div>
                                    <h4 style={{ margin: "0.5rem 0" }}>Level {tg.targetLevel} in {skillName}</h4>
                                    
                                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                                       {tg.status !== "COMPLETED" && (
                                           <button onClick={() => updateTrainingGoalStatus(tg.id, "COMPLETED")} className={styles.btnAction}>Abschließen</button>
                                       )}
                                       <button onClick={() => deleteTrainingGoal(tg.id)} className={styles.btnDanger}>Löschen</button>
                                    </div>
                                 </div>
                             );
                          })}
                       </div>
                   ) : (
                       <p>Keine Ziele definiert. Lege Ziele im Ist-Soll Abgleich an.</p>
                   )}
                </div>
             )}

             {activeTab === "zertifikate" && (
                <div className={styles.card}>
                   <h3 style={{ marginBottom: "1rem" }}>Zertifikate & Nachweise</h3>
                   <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                         <label className={styles.label}>Bezeichnung</label>
                         <input type="text" className={styles.input} value={newCertName} onChange={e=>setNewCertName(e.target.value)} placeholder="z.B. Scrum Master PSM I" />
                      </div>
                      <div style={{ flex: 1 }}>
                         <label className={styles.label}>Aussteller / Institution</label>
                         <input type="text" className={styles.input} value={newCertIssuer} onChange={e=>setNewCertIssuer(e.target.value)} placeholder="z.B. Scrum.org" />
                      </div>
                      <button className={styles.btnPrimary} onClick={handleAddCert}>Hinzufügen</button>
                   </div>

                   <table className={styles.table}>
                      <thead>
                         <tr>
                            <th>Nachweis</th>
                            <th>Aussteller</th>
                            <th>Hinzugefügt am</th>
                            <th>Aktion</th>
                         </tr>
                      </thead>
                      <tbody>
                         {selectedMember.certificates && selectedMember.certificates.map((cert:any) => (
                            <tr key={cert.id}>
                               <td style={{ fontWeight: 600 }}>{cert.name}</td>
                               <td>{cert.issuer || "-"}</td>
                               <td>{new Date(cert.createdAt).toLocaleDateString("de-DE")}</td>
                               <td><button onClick={() => deleteCertificate(cert.id)} className={styles.btnDangerIcon}><X size={14}/></button></td>
                            </tr>
                         ))}
                         {(!selectedMember.certificates || selectedMember.certificates.length===0) && (
                            <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>Keine Nachweise hinterlegt.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             )}

             {activeTab === "willskill" && (
                <div className={styles.card}>
                   <h3 style={{ marginBottom: "1rem" }}>Will-Skill Matrix</h3>
                   <p style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)", marginBottom: "2rem" }}>
                     Visualisiert die Skills über das 2x2 Raster (Können / Motivation). Zeigt nur eingetragene Kompetenzen.
                   </p>
                   
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                       {/* POTENTIALS */}
                       <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px dashed rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px" }}>
                          <h4 style={{ color: "#f59e0b", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem", fontWeight: 800 }}>Top Potentials (Wollen viel, Können noch wenig)</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                             {potentialSkills.map((s: any) => (
                                 <div key={s.skillName} style={{ padding: "0.4rem 0.6rem", background: "white", border: "1px solid #f59e0b", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#f59e0b", borderStyle: "solid" }}>
                                    {s.skillName} {s.isTarget && "🎯"}
                                 </div>
                             ))}
                             {potentialSkills.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Keine Einträge</p>}
                          </div>
                       </div>
                       
                       {/* STARS */}
                       <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px dashed rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px" }}>
                          <h4 style={{ color: "#10B981", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem", fontWeight: 800 }}>Stars (Wollen viel, Können viel)</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                             {starSkills.map((s: any) => (
                                 <div key={s.skillName} style={{ padding: "0.4rem 0.6rem", background: "white", border: "1px solid #10B981", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#10B981" }}>
                                    {s.skillName} {s.isTarget && "🎯"}
                                 </div>
                             ))}
                             {starSkills.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Keine Einträge</p>}
                          </div>
                       </div>

                       {/* DEAD WOOD */}
                       <div style={{ background: "rgba(211, 0, 24, 0.05)", border: "1px dashed rgba(211, 0, 24, 0.3)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px" }}>
                          <h4 style={{ color: "#D30018", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem", fontWeight: 800 }}>Dead Wood (Keine Motivation, Wenig Können)</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                             {deadWoodSkills.map((s: any) => (
                                 <div key={s.skillName} style={{ padding: "0.4rem 0.6rem", background: "white", border: "1px solid #D30018", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#D30018" }}>
                                    {s.skillName} {s.isTarget && "🎯"}
                                 </div>
                             ))}
                             {deadWoodSkills.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Keine Einträge</p>}
                          </div>
                       </div>
                       
                       {/* WORKHORSES */}
                       <div style={{ background: "rgba(107, 114, 128, 0.05)", border: "1px dashed rgba(107, 114, 128, 0.3)", borderRadius: "8px", padding: "1.5rem", minHeight: "220px" }}>
                          <h4 style={{ color: "#4B5563", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem", fontWeight: 800 }}>Workhorses (Wenig Motivation, Trotzdem hohes Können)</h4>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                             {workhorseSkills.map((s: any) => (
                                 <div key={s.skillName} style={{ padding: "0.4rem 0.6rem", background: "white", border: "1px solid #6B7280", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, color: "#4B5563" }}>
                                    {s.skillName} {s.isTarget && "🎯"}
                                 </div>
                             ))}
                             {workhorseSkills.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Keine Einträge</p>}
                          </div>
                       </div>
                   </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
