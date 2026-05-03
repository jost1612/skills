"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartsRadarChart, ResponsiveContainer, Tooltip } from "recharts";
import styles from "@/app/dashboard/radar/radar.module.css";
import React, { useState } from "react";
import { createDepartmentSnapshot } from "@/app/actions/development";

type RadarProps = {
  departmentId: string;
  data: any[];
  members: any[];
  snapshots: any[];
};

export default function RadarClient({ departmentId, data, members, snapshots = [] }: RadarProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(members.map(m => m.id))
  );
  const [showTargetProfile, setShowTargetProfile] = useState(true);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState("");

  const toggleMember = (id: string) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMemberIds(next);
  };

  const handleCreateSnapshot = async () => {
     if (!snapshotName) return;
     // Serialize the CURRENT data into JSON to freeze it in time
     const dataJson = JSON.stringify(data);
     await createDepartmentSnapshot(departmentId, snapshotName, dataJson);
     setSnapshotName("");
  };

  const mergedData = React.useMemo(() => {
    if (!selectedSnapshotId) return data;
    const snap = snapshots.find(s => s.id === selectedSnapshotId);
    if (!snap) return data;
    
    try {
      const snapData = JSON.parse(snap.dataJson);
      return data.map(d => {
        const matching = snapData.find((sd: any) => sd.category === d.category);
        return matching ? { ...d, snapshotAverage: matching.teamAverage } : d;
      });
    } catch {
      return data;
    }
  }, [data, selectedSnapshotId, snapshots]);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <h3 className={styles.controlTitle}>Team-Mitglieder vergleichen</h3>
        <div className={styles.memberList}>
          {/* Target Profile Toggle */}
          <button 
             className={`${styles.memberBtn} ${showTargetProfile ? styles.memberBtnActive : ""}`}
             style={{ borderLeftColor: "var(--primary)" }}
             onClick={() => setShowTargetProfile(!showTargetProfile)}
          >
             <div className={styles.avatar} style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                SP
             </div>
             <span style={{ fontWeight: 800 }}>Soll-Profil</span>
          </button>
          
          <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--surface-container-high)', margin: '0.5rem 0' }}></div>

          {members.map(m => {
             const isSelected = selectedMemberIds.has(m.id);
             return (
               <button 
                 key={m.id} 
                 className={`${styles.memberBtn} ${isSelected ? styles.memberBtnActive : ""}`}
                 style={{ borderLeftColor: m.color || "var(--primary)" }}
                 onClick={() => toggleMember(m.id)}
               >
                 <div className={styles.avatar} style={{ backgroundColor: m.color || "var(--primary)" }}>{m.short}</div>
                 <span>{m.name}</span>
               </button>
             );
          })}

          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>HISTORIE</p>
            {snapshots.length > 0 && (
              <select 
                value={selectedSnapshotId || ""} 
                onChange={(e) => setSelectedSnapshotId(e.target.value || null)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-container-high)', fontSize: '0.85rem', marginBottom: '1rem' }}
              >
                <option value="">(Kein Vergleich)</option>
                {snapshots.map((snap: any) => (
                  <option key={snap.id} value={snap.id}>{snap.name}</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
               <input 
                 value={snapshotName}
                 onChange={e => setSnapshotName(e.target.value)}
                 placeholder="Neuer Snapshot (z.B. Q1 2024)"
                 style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-container-high)', fontSize: '0.85rem' }}
               />
               <button 
                  onClick={handleCreateSnapshot}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
               >
                 Speichern
               </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.chartContainer}>
        {data.length === 0 ? (
          <div className={styles.emptyChart}>Keine Skills gefunden für das Radar.</div>
        ) : (
          <ResponsiveContainer width="100%" height={600}>
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="78%" data={mergedData}>
              <PolarGrid stroke="#e2e4e9" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              />

              {showTargetProfile && (
                 <Radar
                   name="Soll-Profil"
                   dataKey="targetProfile"
                   stroke="rgba(211, 0, 24, 0.5)"
                   fill="#D30018"
                   fillOpacity={0.05}
                   strokeDasharray="5 5"
                   dot={{ r: 3, fill: '#D30018' }}
                 />
              )}

              {selectedSnapshotId && (
                 <Radar
                   name={`Snapshot: ${snapshots.find(s => s.id === selectedSnapshotId)?.name}`}
                   dataKey="snapshotAverage"
                   stroke="#2563eb"
                   fill="transparent"
                   fillOpacity={0}
                   strokeDasharray="4 4"
                   dot={{ r: 4, fill: '#2563eb' }}
                 />
              )}

              {members.filter(m => selectedMemberIds.has(m.id)).map((m, i) => (
                <Radar
                   key={m.id}
                   name={m.name}
                   dataKey={m.id}
                   stroke={m.color || "var(--primary)"}
                   fill="transparent"
                   fillOpacity={0}
                   strokeDasharray="3 3"
                   dot={{ r: 3, fill: m.color || "var(--primary)" }}
                />
              ))}
            </RechartsRadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
