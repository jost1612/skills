"use client";

import React, { useState } from "react";
import styles from "./UsersClient.module.css";
import { UserPlus, Trash2 } from "lucide-react";
import { createUser, deleteUser } from "@/app/actions/user";

type User = {
  id: string;
  email: string;
  name: string | null;
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    setIsSubmitting(true);
    setError("");

    const res = await createUser(email, password, name);
    
    if (res.success) {
      // Optimistic upate (wird aber ohnehin durch revalidatePath refresht)
      setUsers([{ id: "temp", name, email, createdAt: new Date() }, ...users]);
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
                <th>Erstellt am</th>
                <th style={{ textAlign: "right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.flexCell}>
                    <div className={styles.avatar}>
                      {(user.name || user.email).substring(0, 2).toUpperCase()}
                    </div>
                    <strong>{user.name || "Ohne Name"}</strong>
                    {user.id === currentUserId && <span style={{marginLeft: 8, fontSize: '0.75rem', background: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '2px 6px', borderRadius: 4}}>Du</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString("de-DE")}</td>
                  <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end" }}>
                    <button 
                      className={`${styles.actionBtn} ${user.id === currentUserId ? styles.actionBtnDisabled : ""}`}
                      onClick={() => handleDeleteUser(user.id, user.name || user.email)}
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
      </div>
    </div>
  );
}
