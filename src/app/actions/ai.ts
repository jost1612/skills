"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

export type ChatMessage = {
  role: "user" | "model";
  content: string;
};

export async function generateAIResponse(deptId: string, history: ChatMessage[], newMessage: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!process.env.GEMINI_API_KEY) {
    return { success: false, message: "GEMINI_API_KEY ist nicht auf dem Server konfiguriert." };
  }

  // Initialize SDK.
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    // 1. Fetch ALL relevant Department Data to act as Context
    const department = await prisma.department.findUnique({
      where: { id: deptId },
      include: {
        members: {
          include: {
            skillScores: {
              include: { skill: true }
            },
            assignedTasks: true
          }
        },
        skillCategories: {
          include: { skills: true }
        },
        tasks: {
          include: {
            requiredSkills: true,
            assignedTo: true
          }
        }
      }
    });

    if (!department) throw new Error("Abteilung nicht gefunden.");

    // 2. Build the immense Data Context String
    let contextBuilder = `Du bist ein hochintelligenter, hilfreicher KI-Assistent für das "Kinetic Matrix" Kompetenz-Management System der Abteilung "${department.name}".\n\n`;
    contextBuilder += `Hier sind alle Live-Daten deiner Abteilung, nutze sie präzise, um Fragen zu beantworten, Stellvertreter zu finden oder Profile zu schreiben:\n\n`;

    // Members & Skills
    contextBuilder += `### MITARBEITER & IHRE SKILLS (Level 1-4):\n`;
    for (const member of department.members) {
      contextBuilder += `- **${member.name}** (Kürzel: ${member.short}):\n`;
      const scores = member.skillScores.filter(s => s.score > 0);
      if (scores.length > 0) {
        contextBuilder += `  Skills: ${scores.map(s => `${s.skill.name} (Lvl ${s.score})`).join(", ")}\n`;
      } else {
        contextBuilder += `  Skills: Keine bewertet.\n`;
      }
    }

    contextBuilder += `\n### AUFGABEN (Tasks) & ZUWEISUNGEN:\n`;
    for (const task of department.tasks) {
      contextBuilder += `- **Aufgabe: ${task.name}** (Kategorie: ${task.category})\n`;
      if (task.desc) contextBuilder += `  Beschreibung: ${task.desc}\n`;
      if (task.requiredSkills.length > 0) {
        contextBuilder += `  Benötigte Skills: ${task.requiredSkills.map(s => s.name).join(", ")}\n`;
      }
      if (task.assignedTo.length > 0) {
        contextBuilder += `  Zugewiesen an: ${task.assignedTo.map(m => m.name).join(", ")}\n`;
      } else {
        contextBuilder += `  Zugewiesen an: Niemand.\n`;
      }
    }

    contextBuilder += `\nDEINE ANWEISUNGEN:
1. Antworte immer auf Deutsch, professionell und motivierend.
2. Wenn nach Stellvertretern gefragt wird, analysiere die benötigten Skills der Aufgaben der ausfallenden Person und suche Mitarbeiter mit denselben Skills.
3. Wenn du Vorlagen schreibst (z.B. Stellenprofile), nutze Markdown Formatierung für gute Lesbarkeit.
4. Erwähne keine internen IDs oder System-Metadaten.
`;

    // 3. Prepare the history format for the API
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Add the new message
    formattedHistory.push({
      role: "user",
      parts: [{ text: newMessage }]
    });

    // 4. Call Gemini!
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction: contextBuilder,
        temperature: 0.3, // Low temperature for factual, data-driven answers
      }
    });

    return { 
      success: true, 
      text: response.text 
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { success: false, message: "Es gab einen Fehler bei der KI-Anfrage: " + error.message };
  }
}
