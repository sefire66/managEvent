// client dashboard page

import React from "react";
import Dashboard from "../components/ClientDashboard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function dashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.role) {
    redirect("/");
  }

  if (
    !session ||
    !session.user ||
    !["client", "admin", "super-admin"].includes(session.user.role)
  ) {
    redirect("/");
  }

  return (
    <Dashboard />

    // <Dashboard />
  );
}
