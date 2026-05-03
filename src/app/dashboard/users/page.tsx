import { auth } from "@/auth";
import { getUsers } from "@/app/actions/user";
import { redirect } from "next/navigation";
import UsersClient from "@/components/users/UsersClient";

export const metadata = {
  title: "Benutzerverwaltung | Kinetic Matrix",
};

export default async function UsersPage() {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/dashboard/tasks");
  }

  const users = await getUsers();

  return (
    <UsersClient 
       initialUsers={users} 
       currentUserId={session.user.id} 
    />
  );
}
