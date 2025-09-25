import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "../components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.role) {
    redirect("/");
  }

  if (!["admin", "super-admin"].includes(session.user.role)) {
    redirect("/");
  }

  return <AdminDashboardClient session={session} />;
}
