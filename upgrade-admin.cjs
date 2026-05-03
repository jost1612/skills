const { PrismaClient } = require('@prisma/client');

(async () => {
  try {
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findFirst({
      where: { email: { contains: "stefan" } }
    });

    if (!user) {
      console.log("❌ Keinen passenden Admin-User gefunden!");
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        role: "ADMIN",
        canUseAI: true
      }
    });

    console.log(`✅ Benutzer '${user.email}' ist nun ADMIN und darf die KI nutzen!`);
  } catch(e) {
    console.error('❌ Fehler:', e.message);
  }
})();
