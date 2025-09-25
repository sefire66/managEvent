// app/adminDashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManager from "../components/admin/UserManager";
import EventManager from "../components/admin/EventManager";

import PackageManager from "../components/admin/PackageManager";
import SmsSender from "../components/admin/SmsSender";
import { useEffect, useState } from "react";
import { User } from "../types/types";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.role) {
    redirect("/");
  }

  // עכשיו אפשר להשתמש בלי שגיאה:
  console.log("ה-role של המשתמש:", session.user.role!);

  if (!session || !["admin", "super-admin"].includes(session.user?.role)) {
    redirect("/"); // חסימה והפניה אם אין הרשאות
  }

  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-8 min-h-screen bg-gray-100 mt-18">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-lg mt-2 text-gray-700">
          שלום {session.user?.name}, אתה מחובר כ-{session.user?.role}.
        </p>
      </header>

      <main className="space-y-6">
        <section className="p-6 bg-white rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">ניהול משתמשים</h2>
          <UserManager
            users={users}
            setUsers={setUsers}
            fetchUsers={fetchUsers}
          />
        </section>

        <section className="p-6 bg-white rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">ניהול אירועים</h2>
          <EventManager />
        </section>

        <section className="p-6 bg-white rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">ניהול חבילות</h2>
          <p className="text-gray-600">
            כאן תוכל לצפות בחבילות המנויים הקיימות במערכת.
          </p>
          <PackageManager />
        </section>

        {session.user?.role === "super-admin" && (
          <section className="p-6 bg-red-50 rounded shadow border border-red-200">
            <h2 className="text-2xl font-semibold mb-4 text-red-700">
              ניהול אדמינים (Super Admin בלבד)
            </h2>
            <p className="text-red-600">
              כאן רק סופר אדמין יכול להוסיף, לשנות או למחוק אדמינים.
            </p>
            {/* בהמשך תוכל להוסיף כאן קומפוננטה לניהול אדמינים */}
          </section>
        )}
        <section className="p-6 bg-white rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">שליחת SMS</h2>
          <SmsSender />
        </section>
      </main>
    </div>
  );
}
