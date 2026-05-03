"use client";

import React, { useState } from "react";
import styles from "./jobInteractive.module.css";
import { updateJobProfile } from "@/app/actions/jobProfile";
import { Check } from "lucide-react";

type JobProfileProps = {
  departmentId: string;
  departmentName: string;
  profile: any;
  tasks: any[];
  initialTargetTasks: any[];
};

export default function JobProfileInteractiveClient({ 
  departmentId, 
  departmentName, 
  profile, 
  tasks, 
  initialTargetTasks 
}: JobProfileProps) {

  const [formData, setFormData] = useState({
    title: profile?.title || `${departmentName} Expert`,
    subtitle: profile?.subtitle || "Arbeitsplatzprofil & Anforderungen",
    introTitle: profile?.introTitle || "Einführung",
    intro: profile?.intro || "Beschreiben Sie hier die generelle Rolle...",
    tasksTitle: profile?.tasksTitle || "Ihre Aufgaben",
    requirementsTitle: profile?.requirementsTitle || "Anforderungen",
    offerTitle: profile?.offerTitle || "Unser Angebot"
  });

  const [targetTaskIds, setTargetTaskIds] = useState<Set<string>>(
    new Set(initialTargetTasks.map((t: any) => t.id))
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTargetTask = (taskId: string) => {
    setTargetTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateJobProfile(departmentId, formData, Array.from(targetTaskIds));
    setIsSaving(false);
  };

  // Build the list of active tasks for the preview
  const activeTasks = tasks.filter((t: any) => targetTaskIds.has(t.id));

  return (
    <div className={styles.container}>
      {/* Editor Side */}
      <div className={styles.editorPane}>
        <div className={styles.editorHeader}>
          <h2 className={styles.editorTitle}>Soll-Profil Editor</h2>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Speichert..." : "Speichern"}
          </button>
        </div>

        <div className={styles.editorSection}>
          <h3 className={styles.editorSectionTitle}>Kopfzeile</h3>
          <div className={styles.inputGroup}>
            <label>Titel</label>
            <input 
               value={formData.title} 
               onChange={e => handleInputChange("title", e.target.value)} 
               className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Untertitel</label>
            <input 
               value={formData.subtitle} 
               onChange={e => handleInputChange("subtitle", e.target.value)} 
               className={styles.input}
            />
          </div>
        </div>

        <div className={styles.editorSection}>
          <h3 className={styles.editorSectionTitle}>Unternehmen & Rolle</h3>
          <div className={styles.inputGroup}>
            <label>Titel der Sektion</label>
            <input 
               value={formData.introTitle} 
               onChange={e => handleInputChange("introTitle", e.target.value)} 
               className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Text</label>
            <textarea 
               value={formData.intro} 
               onChange={e => handleInputChange("intro", e.target.value)} 
               className={styles.textarea}
               rows={4}
            />
          </div>
        </div>

        <div className={styles.editorSection}>
          <h3 className={styles.editorSectionTitle}>Aufgaben Zuordnung</h3>
          <div className={styles.inputGroup}>
            <label>Titel der Sektion</label>
            <input 
               value={formData.tasksTitle} 
               onChange={e => handleInputChange("tasksTitle", e.target.value)} 
               className={styles.input}
            />
          </div>
          <label className={styles.subtext}>Aktivieren Sie die gewünschten Aufgaben für das Profil:</label>
          <div className={styles.targetTasksList}>
             {tasks.map((t: any) => {
               const isActive = targetTaskIds.has(t.id);
               return (
                 <div 
                   key={t.id} 
                   className={`${styles.targetTaskItem} ${isActive ? styles.targetTaskItemActive : ""}`}
                   onClick={() => toggleTargetTask(t.id)}
                 >
                   <div className={`${styles.checkbox} ${isActive ? styles.checkboxActive : ""}`}>
                     {isActive && <Check size={12} color="white" strokeWidth={3} />}
                   </div>
                   <span className={styles.targetTaskName}>{t.name}</span>
                   <span className={styles.targetTaskCategory}>{t.category}</span>
                 </div>
               )
             })}
          </div>
        </div>

        <div className={styles.editorSection}>
          <h3 className={styles.editorSectionTitle}>Anforderungen & Angebot</h3>
          <div className={styles.inputGroup}>
             <label>Anforderungen (Titel)</label>
             <input 
               value={formData.requirementsTitle} 
               onChange={e => handleInputChange("requirementsTitle", e.target.value)} 
               className={styles.input}
             />
          </div>
          <div className={styles.inputGroup}>
             <label>Angebot (Titel)</label>
             <input 
               value={formData.offerTitle} 
               onChange={e => handleInputChange("offerTitle", e.target.value)} 
               className={styles.input}
             />
          </div>
        </div>
      </div>

      {/* Preview Side */}
      <div className={styles.previewPane}>
        <div className={styles.a4Preview}>
          <div className={styles.a4Header}>
            <div className={styles.a4LogoBlock}>
              <div className={styles.a4Logo}>K</div>
              <span className={styles.a4Company}>KINETIC MATRIX</span>
            </div>
            <span className={styles.a4Date}>{new Date().toLocaleDateString("de-DE")}</span>
          </div>

          <h1 className={styles.a4Title}>{formData.title}</h1>
          {formData.subtitle && <h2 className={styles.a4Subtitle}>{formData.subtitle}</h2>}

          <div className={styles.a4Section}>
            <h3 className={styles.a4SectionTitle}>{formData.introTitle}</h3>
            <p className={styles.a4Text}>{formData.intro}</p>
          </div>

          {/* Tasks Section / Ihr Verantwortungsbereich */}
          <div className={styles.a4Section}>
            <h3 className={styles.a4SectionTitle}>{formData.tasksTitle}</h3>
            {activeTasks.length === 0 ? (
               <p className={styles.a4Text} style={{ fontStyle: "italic", color: "var(--on-surface-variant)" }}>
                 (Bitte wählen Sie links Aufgaben aus, um die Verantwortungsbereiche zu generieren)
               </p>
            ) : (
               <ul className={styles.a4List} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {activeTasks.map((t: any) => (
                   <li key={t.id} className={styles.a4ListItem}>
                     <strong style={{ color: 'var(--on-surface)' }}>{t.name}: </strong> 
                     <span style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{t.desc || "Verantwortung für diesen Aufgabenbereich."}</span>
                   </li>
                 ))}
               </ul>
            )}
          </div>

          {/* Profil / Anforderungen Section */}
          <div className={styles.a4Section}>
            <h3 className={styles.a4SectionTitle}>{formData.requirementsTitle}</h3>
            {(() => {
               const requiredIds = new Set<string>();
               activeTasks.forEach((t: any) => t.requiredSkills?.forEach((s: any) => requiredIds.add(s.id)));
               
               if (requiredIds.size === 0) return <p className={styles.a4Text} style={{ fontStyle: "italic", color: "var(--on-surface-variant)" }}>(Aus den Aufgaben wurden noch keine spezifischen Skills abgeleitet)</p>;

               const allSkillObjects = activeTasks.flatMap(t => t.requiredSkills || []);
               const uniqueSkillsMap = new Map();
               allSkillObjects.forEach((s:any) => {
                 if (!uniqueSkillsMap.has(s.id)) uniqueSkillsMap.set(s.id, s);
               });
               const uniqueSkills = Array.from(uniqueSkillsMap.values());

               return (
                 <div style={{ marginTop: '0.5rem' }}>
                   <p className={styles.a4Text} style={{ marginBottom: '1rem', fontWeight: 600 }}>Um in dieser Rolle erfolgreich zu sein, bringen Sie fundierte Kenntnisse und Erfahrungen in folgenden Bereichen mit:</p>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                     {uniqueSkills.map((s: any) => (
                       <div key={s.id} style={{ 
                         backgroundColor: 'var(--surface-container-highest)', 
                         padding: '0.4rem 0.8rem', 
                         borderRadius: '6px', 
                         fontSize: '0.8rem',
                         fontWeight: 700,
                         color: 'var(--on-surface-variant)' 
                       }}>
                         ✓ {s.name}
                       </div>
                     ))}
                   </div>
                 </div>
               );
            })()}
          </div>

          {formData.offerTitle && (
            <div className={styles.a4Section}>
              <h3 className={styles.a4SectionTitle}>{formData.offerTitle}</h3>
              <p className={styles.a4Text}>
                Wir bieten ein modernes Arbeitsumfeld mit flexiblen Zeiten und starkem Fokus auf Teamentwicklung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
