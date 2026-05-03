"use client";

import React, { useState } from "react";
import styles from "./UsersClient.module.css";
import { UserPlus, Trash2, Key, Shield, Bot } from "lucide-react";
import { createUser, deleteUser, updatePassword, toggleRole, toggleAI } from "@/app/actions/user";

type User = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  canUseAI: boolean;
  createdAt: Date;
};

type Props = {
  initialUsers: User[];
  currentUserId: string;
};

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [passwordChangeId, setPasswordChangeId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    setIsSubmitting(true);
    setError("");

    const res = await createUser(email, password, name);
    
    if (res.success) {
      // Optimistic upate (wird aber ohnehin durch revalidatePath refresht)
      setUsers([{ id: "temp", name, email, role: "USER", canUseAI: false, createdAt: new Date() }, ...users]);
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      // Force reload to get the real ID if needed, though next/link would fetch it
      window.location.reload();
    } else {
      setError(res.message || "Es ist ein Fehler aufgetreten.");
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (id === currentUserId) return; // Guard
    
    if (!window.confirm(`Möchtest du den Nutzer "${userName}" unwiderruflich löschen?`)) return;

    setUsers(users.filter(u => u.id !== id));
    
    const res = await deleteUser(id);
    if (!res.success) {
      alert("Fehler beim Löschen: " + res.message);
      window.location.reload(); // Recover state
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeId || !newPassword) return;

    if (newPassword.length < 6) {
      alert("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    setIsChangingPwd(true);
    const res = await updatePassword(passwordChangeId, newPassword);
    setIsChangingPwd(false);

    if (res.success) {
      alert("Passwort erfolgreich geändert!");
      setPasswordChangeId(null);
      setNewPassword("");
    } else {
      alert("Fehler: " + res.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Benutzerverwaltung</h1>
          <p className={styles.subtitle}>Verwalte die Administrator-Zugänge dieser Matrix (Insgesamt: {users.length})</p>
        </div>
        
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            <UserPlus size={18} />
            Neuer Benutzer
          </button>
        )}
      </div>

      <div className={styles.grid}>
        <div className={styles.usersCard}>
          <table className={styles.userList}>
            <thead>
              <tr>
                <th>Benutzer</th>
                <th>E-Mail</th>
                <th style={{ textAlign: "center" }}>Berechtigungen</th>
                <th>Erstellt am</th>
                <th style={{ textAlign: "right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.flexCell}>
                    <div className={styles.avatar}>
                      {(user.name || user.email || "??").substring(0, 2).toUpperCase()}
                    </div>
                    <strong>{user.name || "Ohne Name"}</strong>
                    {user.id === currentUserId && <span style={{marginLeft: 8, fontSize: '0.75rem', background: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '2px 6px', borderRadius: 4}}>Du</span>}
                  </td>
                  <td>{user.email}</td>
                  <td style={{ textAlign: "center", display: "flex", justifyContent: "center", gap: "1rem" }}>
                    <button
                      onClick={async () => {
                        const res = await toggleRole(user.id, user.role);
                        if(res.success) window.location.reload();
                        else alert(res.message);
                      }}
                      className={styles.actionBtn}
                      style={{ color: user.role === "ADMIN" ? "var(--primary)" : "var(--surface-container-highest)" }}
                      title={user.role === "ADMIN" ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                    >
                      <Shield size={20} />
                    </button>
                    <button
                      onClick={async () => {
                        const res = await toggleAI(user.id, user.canUseAI);
                        if(res.success) window.location.reload();
                        else alert(res.message);
                      }}
                      className={styles.actionBtn}
                      style={{ color: user.canUseAI ? "#10B981" : "var(--surface-container-highest)" }}
                      title={user.canUseAI ? "KI-Zugriff entziehen" : "KI-Zugriff erlauben"}
                    >
                      <Bot size={20} />
                    </button>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString("de-DE")}</td>
                  <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button 
                      className={styles.actionBtn}
                      style={{ color: "var(--on-surface-variant)" }}
                      onClick={() => setPasswordChangeId(user.id)}
                      title="Passwort ändern"
                    >
                      <Key size={16} />
                    </button>
                    <button 
                      className={`${styles.actionBtn} ${user.id === currentUserId ? styles.actionBtnDisabled : ""}`}
                      onClick={() => handleDeleteUser(user.id, user.name || user.email || "Unbekannt")}
                      disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? "Du kannst dich nicht selbst löschen" : "Benutzer löschen"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>Neuen Zugang anlegen</h3>
            {error && <div className={styles.errorBox}>{error}</div>}
            
            <form onSubmit={handleCreateUser}>
              <div className={styles.inputGroup}>
                <label>Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={styles.input}
                  placeholder="Max Mustermann"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>E-Mail Adresse</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="max@beispiel.de"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Initiales Passwort</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Mindestens 6 Zeichen"
                  minLength={6}
                  required
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => {
                  setShowForm(false);
                  setError("");
                }}>
                  Abbrechen
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Wird erstellt..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        )}

        {passwordChangeId && (
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>Passwort ändern</h3>
            <p style={{fontSize: "0.85rem", color: "var(--on-surface-variant)", marginBottom: "1rem"}}>
              Neues Passwort für den ausgewählten User vergeben.
            </p>
            <form onSubmit={handleUpdatePassword}>
              <div className={styles.inputGroup}>
                <label>Neues Passwort</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Mindestens 6 Zeichen"
                  minLength={6}
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => {
                  setPasswordChangeId(null);
                  setNewPassword("");
                }}>
                  Abbrechen
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isChangingPwd}>
                  {isChangingPwd ? "Wird gespeichert..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
