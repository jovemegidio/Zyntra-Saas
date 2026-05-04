import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardClient
      userId={user.id}
      userName={user.name}
      userEmail={user.email}
    />
  );
}
