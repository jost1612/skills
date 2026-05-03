"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSkillScore(memberId: string, skillId: string, score: number) {
  try {
    if (score < 0) {
      const existing = await prisma.skillScore.findUnique({
        where: { memberId_skillId: { memberId, skillId } }
      });
      if (existing) {
        if (existing.interest === 0) {
          await prisma.skillScore.delete({
            where: { memberId_skillId: { memberId, skillId } }
          });
        } else {
          await prisma.skillScore.update({
            where: { memberId_skillId: { memberId, skillId } },
            data: { score: 0 }
          });
        }
      }
    } else {
      await prisma.skillScore.upsert({
        where: {
          memberId_skillId: { memberId, skillId }
        },
        update: { score },
        create: {
          memberId,
          skillId,
          score
        }
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSkillInterest(memberId: string, skillId: string, interest: number) {
  try {
    if (interest === 0) {
      const existing = await prisma.skillScore.findUnique({
        where: { memberId_skillId: { memberId, skillId } }
      });
      if (existing) {
        if (existing.score === 0) {
          await prisma.skillScore.delete({
            where: { memberId_skillId: { memberId, skillId } }
          });
        } else {
          await prisma.skillScore.update({
            where: { memberId_skillId: { memberId, skillId } },
            data: { interest: 0 }
          });
        }
      }
    } else {
      await prisma.skillScore.upsert({
        where: {
          memberId_skillId: { memberId, skillId }
        },
        update: { interest },
        create: {
          memberId,
          skillId,
          score: 0,
          interest
        }
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moveSkillToCategory(skillId: string, categoryId: string) {
  try {
    await prisma.skill.update({
      where: { id: skillId },
      data: { categoryId }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
