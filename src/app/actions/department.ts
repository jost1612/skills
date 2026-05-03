"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getDepartments() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Fetch all departments. In a real scenario, this might be filtered by ownerId
  const departments = await prisma.department.findMany({
    include: {
      snapshots: true,
      members: {
        include: {
          assignedTasks: true,
          certificates: true,
          trainingGoals: true,
          skillScores: true
        }
      },
      skillCategories: {
        include: {
          skills: {
            include: {
              scores: true,
            }
          }
        }
      },
      tasks: {
        include: {
          requiredSkills: true,
          assignedTo: true,
        }
      },
      jobProfile: true,
      targetTasks: true,
      excludedTargetSkills: true,
    }
  });

  return departments;
}
