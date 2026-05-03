import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AIChatClient from "@/components/ai/AIChatClient";
import { prisma } from "@/lib/prisma";
import { listAIChats } from "@/app/actions/ai";

export const metadata = {
  title: "KI-Assistent | Kinetic Matrix",
};

export default async function AIPage(props: { searchParams: Promise<{ deptId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.canUseAI) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <h2>Zugriff verweigert</h2>
        <p>Du hast keine Berechtigung, den KI-Assistenten zu nutzen. Bitte wende dich an einen Administrator.</p>
      </div>
    );
  }

  // Find user's first department or the selected one
  let activeDept = null;
  if (searchParams.deptId) {
    activeDept = await prisma.department.findUnique({
      where: { id: searchParams.deptId }
    });
  }

  if (!activeDept) {
    activeDept = await prisma.department.findFirst({
      orderBy: { name: 'asc' }
    });
  }

  if (!activeDept) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Keine Abteilung gefunden.</h2>
        <p>Bitte erstelle zuerst eine Abteilung, bevor du die KI nutzt.</p>
      </div>
    );
  }

  const chats = await listAIChats(activeDept.id);

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <AIChatClient key={activeDept.id} deptId={activeDept.id} deptName={activeDept.name} initialChats={chats} />
    </div>
  );
}
