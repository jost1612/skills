"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./AIChatClient.module.css";
import { Send, BotMessageSquare } from "lucide-react";
import { generateAIResponse, ChatMessage } from "@/app/actions/ai";
import ReactMarkdown from "react-markdown";

type Props = {
  deptId: string;
  deptName: string;
};

export default function AIChatClient({ deptId, deptName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `Hallo! Ich bin dein Kinetic Matrix KI-Assistent für die Abteilung **${deptName}**. \n\nIch kenne alle Mitarbeiter, deren Skills und zugewiesenen Aufgaben in dieser Abteilung. Frag mich z.B.:\n- *Wer eignet sich basierend auf seinen Skills am besten als Stellvertreter für einen bestimmten Kollegen?*\n- *Schreibe ein Profil für eine neue Stelle, die uns bei Projekt XY entlastet.*`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      // Send the history (excluding the first greeting to save tokens, or include it if helpful)
      // We pass the actual conversational history excluding initial hardcoded prompt if we want,
      // but let's just pass everything since it helps context.
      const res = await generateAIResponse(deptId, newHistory.slice(1), userMessage.content);
      
      if (res.success && res.text) {
        setMessages(prev => [...prev, { role: "model", content: res.text as string }]);
      } else {
        setMessages(prev => [...prev, { role: "model", content: `❌ Fehler: ${res.message}` }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "model", content: "❌ Ein unerwarteter Fehler ist aufgetreten." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <BotMessageSquare size={24} />
        </div>
        <div>
          <h2 className={styles.headerTitle}>Matrix KI-Assistent</h2>
          <p className={styles.headerSubtitle}>Powered by Google Gemini 2.5</p>
        </div>
      </div>

      <div className={styles.chatArea}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`${styles.messageRow} ${styles[msg.role]}`}>
            <div className={`${styles.messageBubble} ${styles[msg.role]}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.model}`}>
            <div className={styles.loadingBubble}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSend} className={styles.form}>
          <input
            type="text"
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frag mich etwas über deine Mitarbeiter oder Aufgaben..."
            disabled={isLoading}
          />
          <button type="submit" className={styles.sendBtn} disabled={!input.trim() || isLoading}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
