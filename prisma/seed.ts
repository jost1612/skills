import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log("Starte Datenbank Seeding...")
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@matrix.local' },
    update: {},
    create: {
      email: 'admin@matrix.local',
      name: 'Admin User',
      password: hashedPassword,
    },
  })

  // Read JSON
  const jsonPath = path.join(process.cwd(), '_legacy/kinetic_matrix_export (5).json')
  if (!fs.existsSync(jsonPath)) {
    console.error("Datei nicht gefunden:", jsonPath)
    return
  }
  
  const fileContent = fs.readFileSync(jsonPath, 'utf-8')
  const departmentsData = JSON.parse(fileContent)

  // Clear existing to avoid unique constraint issues
  await prisma.department.deleteMany()

  for (const deptData of departmentsData) {
    console.log(`Importiere Abteilung: ${deptData.name}`)
    
    // Create Department
    const dept = await prisma.department.create({
      data: {
        id: deptData.id,
        name: deptData.name,
        ownerId: user.id,
      }
    })

    // Create Profile if exists
    if (deptData.jobProfile) {
      await prisma.jobProfile.create({
        data: {
          departmentId: dept.id,
          title: deptData.jobProfile.title || "",
          subtitle: deptData.jobProfile.subtitle || "",
          introTitle: "Einführung",
          intro: deptData.jobProfile.intro || "",
          tasksTitle: deptData.jobProfile.tasksTitle || "",
          requirementsTitle: deptData.jobProfile.requirementsTitle || "",
          offerTitle: deptData.jobProfile.offerTitle || "",
        }
      })
    }

    // Create Members
    const memberMap = new Map()
    for (const m of deptData.members) {
      const newMember = await prisma.member.create({
        data: {
          id: m.id,
          departmentId: dept.id,
          name: m.name,
          short: m.short,
          color: m.color,
          title: m.title || "",
        }
      })
      memberMap.set(m.id, newMember)
    }

    // Create Skills and SkillCategories
    const skillMap = new Map() // original skill id to Prisma ID
    const skillCategories = Object.keys(deptData.skills)
    
    for (const catName of skillCategories) {
      const createdCat = await prisma.skillCategory.create({
        data: {
          departmentId: dept.id,
          name: catName
        }
      })

      const skillsInCat = deptData.skills[catName]
      for (const s of skillsInCat) {
        const createdSkill = await prisma.skill.create({
          data: {
            id: s.id,
            categoryId: createdCat.id,
            name: s.name,
            level: 3,
            desc: s.desc || ""
          }
        })
        skillMap.set(s.id, createdSkill)

        // Process Scores
        if (s.scores) {
          for (const memberId of Object.keys(s.scores)) {
            const scoreValue = s.scores[memberId]
            if (memberMap.has(memberId) && scoreValue > 0) {
              await prisma.skillScore.create({
                data: {
                  memberId: memberId,
                  skillId: createdSkill.id,
                  score: scoreValue
                }
              })
            }
          }
        }
      }
    }

    // Create Tasks
    if (deptData.tasks) {
      for (const t of deptData.tasks) {
        const requiredSkillSet = t.requiredSkills.map((rsId: string) => ({ id: rsId })).filter((x: any) => skillMap.has(x.id))
        
        await prisma.task.create({
          data: {
            id: t.id,
            departmentId: dept.id,
            name: t.name,
            category: t.category || "Allgemein",
            desc: t.desc || "",
            requiredSkills: {
              connect: requiredSkillSet
            }
          }
        })
      }
    }

    // Assign Tasks to Members
    if (deptData.memberTasks) {
       for (const memberId of Object.keys(deptData.memberTasks)) {
          const taskIds = deptData.memberTasks[memberId]
          if (memberMap.has(memberId) && taskIds.length > 0) {
             const connectTasks = taskIds.map((tId: string) => ({ id: tId }))
             await prisma.member.update({
               where: { id: memberId },
               data: {
                 assignedTasks: {
                   connect: connectTasks
                 }
               }
             })
          }
       }
    }

  }

  console.log('Seeding erfolgreich beendet!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
