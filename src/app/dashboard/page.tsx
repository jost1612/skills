import { redirect } from "next/navigation";

export default function DashboardIndex() {
  // Standardmäßig auf Matrix umleiten
  redirect("/dashboard/matrix");
}
