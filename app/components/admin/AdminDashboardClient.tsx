"use client";

import { useEffect, useState } from "react";
import { User } from "../../types/types";
import UserManager from "./UserManager";
import EventManager from "./EventManager";
import PackageManager from "./PackageManager";
import SmsSender from "./SmsSender";
import PaymentManager from "./PaymentManager";
import BillingProfileManager from "../BillingProfileManager";
import PaymentRequestManager from "./PaymentRequestManager";

type Props = {
  session: any;
};

export default function AdminDashboardClient({ session }: Props) {
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
        <section className="p-6 bg-white rounded shadow"></section>

        {["admin", "super-admin"].includes(session.user?.role) && (
          <section className="p-6 bg-white rounded shadow">
            <PaymentManager onUsersUpdated={fetchUsers} />
          </section>
        )}

        {["admin", "super-admin"].includes(session.user?.role) && (
          <section className="p-6 bg-white rounded shadow">
            <PaymentRequestManager />
          </section>
        )}

        {["admin", "super-admin"].includes(session.user?.role) && (
          <section className="p-6 bg-white rounded shadow">
            <BillingProfileManager session={session} />
          </section>
        )}

        <section className="p-6 bg-white rounded shadow">
          {/* <h2 className="text-2xl font-semibold mb-4">ניהול משתמשים</h2> */}
          <UserManager
            users={users}
            setUsers={setUsers}
            fetchUsers={fetchUsers}
          />
        </section>

        <section className="p-6 bg-white rounded shadow">
          {/* <h2 className="text-2xl font-semibold mb-4">ניהול אירועים</h2> */}
          <EventManager />
        </section>

        <section className="p-6 bg-white rounded shadow">
          {/* <h2 className="text-2xl font-semibold mb-4">ניהול חבילות</h2> */}
          {/* <p className="text-gray-600">
            כאן תוכל לצפות בחבילות המנויים הקיימות במערכת.
          </p> */}
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
          </section>
        )}

        <section className="p-6 bg-white rounded shadow">
          {/* <h2 className="text-2xl font-semibold mb-4">שליחת SMS</h2> */}
          <SmsSender onSmsSent={fetchUsers} />
        </section>
      </main>
    </div>
  );
}
