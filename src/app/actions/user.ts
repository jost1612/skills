"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Holt alle Nutzer ohne deren gehashte Passwörter
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      canUseAI: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createUser(email: string, passwordRaw: string, name: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: "Ein Nutzer mit dieser E-Mail existiert bereits." };
    }

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      }
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    console.error("Fehler beim Erstellen des Nutzers:", error);
    return { success: false, message: "Datenbankfehler." };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  if (session.user.id === id) {
     return { success: false, message: "Du kannst dich nicht selbst löschen." };
  }

  try {
    await prisma.user.delete({
      where: { id }
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    console.error("Fehler beim Löschen des Nutzers:", error);
    return { success: false, message: "Datenbankfehler." };
  }
}

export async function updatePassword(id: string, newPasswordRaw: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Fehler beim Ändern des Passworts:", error);
    return { success: false, message: "Fehler beim Speicher in der Datenbank." };
  }
}

export async function toggleRole(id: string, currentRole: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  if (session.user.id === id) {
     return { success: false, message: "Du kannst dir selbst nicht die Admin-Rechte entziehen." };
  }

  const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";

  try {
    await prisma.user.update({
      where: { id },
      data: { role: newRole }
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: "Fehler beim Speicher in der Datenbank." };
  }
}

export async function toggleAI(id: string, currentStatus: boolean) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    await prisma.user.update({
      where: { id },
      data: { canUseAI: !currentStatus }
    });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: "Fehler beim Speicher in der Datenbank." };
  }
}
