"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTask(departmentId: string, category: string, name: string) {
  try {
    const task = await prisma.task.create({
      data: {
        departmentId,
        category,
        name,
        desc: ""
      }
    });
    revalidatePath("/dashboard");
    return { success: true, task };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTask(taskId: string, data: { name?: string, desc?: string, category?: string }) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data
    });
    revalidatePath("/dashboard");
    return { success: true, task };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await prisma.task.delete({
      where: { id: taskId }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCategory(departmentId: string, oldName: string, newName: string) {
  try {
    await prisma.task.updateMany({
      where: { departmentId, category: oldName },
      data: { category: newName }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCategory(departmentId: string, categoryName: string) {
  try {
    await prisma.task.deleteMany({
      where: { departmentId, category: categoryName }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleMemberTask(memberId: string, taskId: string, assign: boolean) {
  try {
    if (assign) {
      await prisma.member.update({
        where: { id: memberId },
        data: {
          assignedTasks: {
            connect: { id: taskId }
          }
        }
      });
    } else {
      await prisma.member.update({
        where: { id: memberId },
        data: {
          assignedTasks: {
            disconnect: { id: taskId }
          }
        }
      });
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleTaskSkill(taskId: string, skillId: string, assign: boolean) {
  try {
    if (assign) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          requiredSkills: {
            connect: { id: skillId }
          }
        }
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          requiredSkills: {
            disconnect: { id: skillId }
          }
        }
      });
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
