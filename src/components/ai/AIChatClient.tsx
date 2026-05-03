"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import styles from "./AIChatClient.module.css";
import { Send, BotMessageSquare, Plus, Trash2, MessageSquare, Pencil } from "lucide-react";
import {
  generateAIResponse,
  listAIChats,
  getAIChat,
  createAIChat,
  deleteAIChat,
  renameAIChat,
  ChatMessage,
  ChatSummary,
} from "@/app/actions/ai";
import ReactMarkdown from "react-markdown";

type Props = {
  deptId: string;
  deptName: string;
  initialChats: ChatSummary[];
};

function greetingMessage(deptName: string): ChatMessage {
  return {
    role: "model",
    content: `Hallo! Ich bin dein Kinetic Matrix KI-Assistent für die Abteilung **${deptName}**. \n\nIch kenne alle Mitarbeiter, deren Skills und zugewiesenen Aufgaben in dieser Abteilung. Frag mich z.B.:\n- *Wer eignet sich basierend auf seinen Skills am besten als Stellvertreter für einen bestimmten Kollegen?*\n- *Schreibe ein Profil für eine neue Stelle, die uns bei Projekt XY entlastet.*`,
  };
}

export default function AIChatClient({ deptId, deptName, initialChats }: Props) {
  const [chats, setChats] = useState<ChatSummary[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMessage(deptName)]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const refreshChats = async () => {
    const list = await listAIChats(deptId);
    setChats(list);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([greetingMessage(deptName)]);
    setInput("");
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId === activeChatId) return;
    startTransition(async () => {
      const chat = await getAIChat(chatId);
      if (!chat) {
        await refreshChats();
        return;
      }
      setActiveChatId(chat.id);
      setMessages(chat.messages.length ? chat.messages : [greetingMessage(deptName)]);
      setInput("");
    });
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Diesen Chat wirklich löschen?")) return;
    await deleteAIChat(chatId);
    if (chatId === activeChatId) {
      setActiveChatId(null);
      setMessages([greetingMessage(deptName)]);
    }
    await refreshChats();
  };

  const handleRenameChat = async (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = prompt("Neuer Titel", currentTitle);
    if (!next || next.trim() === currentTitle) return;
    await renameAIChat(chatId, next.trim());
    await refreshChats();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const isFirstMessage = activeChatId === null;
    const historyForApi = messages.slice(1); // drop greeting
    const newHistory = [...messages, userMessage];

    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    let chatId = activeChatId;
    try {
      if (isFirstMessage && !chatId) {
        const created = await createAIChat(deptId, userMessage.content);
        chatId = created.id;
        setActiveChatId(chatId);
      }

      const res = await generateAIResponse(deptId, historyForApi, userMessage.content, chatId);

      if (res.success && typeof res.text === "string") {
        setMessages((prev) => [...prev, { role: "model", content: res.text as string }]);
        if (res.chatId && res.chatId !== chatId) {
          setActiveChatId(res.chatId);
        }
      } else {
        setMessages((prev) => [...prev, { role: "model", content: `❌ Fehler: ${res.message}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "model", content: "❌ Ein unerwarteter Fehler ist aufgetreten." }]);
    } finally {
      setIsLoading(false);
      await refreshChats();
    }
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <button className={styles.newChatBtn} onClick={handleNewChat} type="button">
          <Plus size={16} />
          <span>Neuer Chat</span>
        </button>

        <div className={styles.chatList}>
          {chats.length === 0 ? (
            <p className={styles.emptyHint}>Noch keine Chats. Stelle deine erste Frage unten.</p>
          ) : (
            chats.map((c) => {
              const isActive = c.id === activeChatId;
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`${styles.chatItem} ${isActive ? styles.chatItemActive : ""}`}
                  onClick={() => handleSelectChat(c.id)}
                  disabled={isPending}
                >
                  <MessageSquare size={14} className={styles.chatItemIcon} />
                  <span className={styles.chatItemTitle}>{c.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Umbenennen"
                    className={styles.chatItemAction}
                    onClick={(e) => handleRenameChat(c.id, c.title, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleRenameChat(c.id, c.title, e as unknown as React.MouseEvent);
                    }}
                  >
                    <Pencil size={13} />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Löschen"
                    className={styles.chatItemAction}
                    onClick={(e) => handleDeleteChat(c.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleDeleteChat(c.id, e as unknown as React.MouseEvent);
                    }}
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

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
    </div>
  );
}
