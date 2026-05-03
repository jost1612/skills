"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateJobProfile(
  departmentId: string, 
  profileData: any, 
  targetTaskIds: string[]
) {
  try {
    // 1. Upsert the Job Profile literal texts
    await prisma.jobProfile.upsert({
      where: { departmentId },
      update: {
        title: profileData.title,
        subtitle: profileData.subtitle,
        introTitle: profileData.introTitle,
        intro: profileData.intro,
        tasksTitle: profileData.tasksTitle,
        requirementsTitle: profileData.requirementsTitle,
        offerTitle: profileData.offerTitle
      },
      create: {
        departmentId,
        title: profileData.title || "Titel",
        subtitle: profileData.subtitle || "",
        introTitle: profileData.introTitle || "Einführung",
        intro: profileData.intro || "",
        tasksTitle: profileData.tasksTitle || "Ihre Aufgaben",
        requirementsTitle: profileData.requirementsTitle || "Anforderungen",
        offerTitle: profileData.offerTitle || "Unser Angebot"
      }
    });

    // 2. Set the targetTasks via Prisma connect mapping
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        targetTasks: {
          set: targetTaskIds.map(id => ({ id }))
        }
      }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
