"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type MemberDraft = {
  id: string; // "new-..." for newly created ones
  name: string;
  short: string;
  title: string;
  color: string;
  _deleted?: boolean;
};

export async function saveTeamMembers(departmentId: string, members: MemberDraft[]) {
  try {
    // We execute this in a transaction
    await prisma.$transaction(async (tx) => {
      for (const m of members) {
        if (m._deleted) {
          // Nur löschen, wenn es eine existierende ID in der DB ist
          if (!m.id.startsWith("new-")) {
            await tx.member.delete({ where: { id: m.id } });
          }
        } else if (m.id.startsWith("new-")) {
          // Neues Member erstellen
          await tx.member.create({
            data: {
              departmentId,
              name: m.name,
              short: m.short,
              title: m.title,
              color: m.color,
            }
          });
        } else {
          // Bestehendes Member aktualisieren
          await tx.member.update({
            where: { id: m.id },
            data: {
              name: m.name,
              short: m.short,
              title: m.title,
              color: m.color,
            }
          });
        }
      }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
