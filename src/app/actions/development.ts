"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addCertificate(data: { memberId: string, name: string, issuer?: string, url?: string }) {
  try {
    const cert = await prisma.certificate.create({ data });
    revalidatePath("/dashboard");
    return { success: true, data: cert };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCertificate(id: string) {
  try {
    await prisma.certificate.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addTrainingGoal(data: { memberId: string, skillId: string, targetLevel: number, dueDate?: Date }) {
  try {
    const goal = await prisma.trainingGoal.create({ data });
    revalidatePath("/dashboard");
    return { success: true, data: goal };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTrainingGoalStatus(id: string, status: string) {
  try {
    await prisma.trainingGoal.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTrainingGoal(id: string) {
  try {
    await prisma.trainingGoal.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createDepartmentSnapshot(departmentId: string, name: string, dataJson: string) {
  try {
    const snap = await prisma.departmentSnapshot.create({
      data: {
        departmentId,
        name,
        dataJson
      }
    });
    revalidatePath("/dashboard");
    return { success: true, data: snap };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDepartmentSnapshot(id: string) {
  try {
    await prisma.departmentSnapshot.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
