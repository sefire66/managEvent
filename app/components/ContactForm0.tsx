"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<
    "success" | "error" | "loading" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("שולח...");
    setStatusType("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("ההודעה נשלחה בהצלחה ✅");
        setStatusType("success");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus(data.error || "אירעה שגיאה בשליחה");
        setStatusType("error");
      }
    } catch {
      setStatus("שגיאת רשת ❌");
      setStatusType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="max-w-xl  p-6 mt-17 ">
      <h1 className="text-2xl font-bold mb-4 text-right">צור קשר</h1>

      <form
        onSubmit={handleSubmit}
        className={`
          flex flex-col gap-4 text-right border p-10 rounded
          ${
            statusType === "success"
              ? "border-green-500 border-3"
              : statusType === "error"
                ? "border-red-500 border-3"
                : "border-gray-300 border-3"
          }
        `}
      >
        <input
          type="text"
          name="name"
          placeholder="שם מלא"
          value={form.name}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="אימייל"
          value={form.email}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <textarea
          name="message"
          placeholder="ההודעה שלך"
          value={form.message}
          onChange={handleChange}
          rows={6}
          className="border p-2 rounded resize-none w-[400px]"
          required
        />
        <button
          type="submit"
          className={`py-2 rounded-full text-white ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "שולח..." : "שלח"}
        </button>
      </form>

      {status && (
        <p
          className={`mt-4 text-right ${
            statusType === "success"
              ? "text-green-600"
              : statusType === "error"
                ? "text-red-600"
                : "text-gray-600"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
