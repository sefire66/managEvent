import React from "react";
import ContactForm from "../components/ContactForm";
import { MessageCircle } from "lucide-react"; // אייקון

export default function Contactus() {
  // ---- הגדרות וואטסאפ (להחליף למספר שלך) ----
  const WHATSAPP_PHONE = "972525572275"; // 050-1234567 => 972501234567
  const WHATSAPP_MSG = "היי! אשמח לפרטים על האירוע שלי";
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
  // --------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 px-4">
      {/* כותרת מעוצבת */}
      <div className="w-[90%] max-w-5xl mt-24 text-right">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-l from-blue-700 to-pink-600">
            צור קשר
          </span>
        </h1>

        <p className="mt-2 text-gray-600 text-lg">טוב להיות בקשר</p>
        <p className="text-gray-600">צריכים עזרה? נשמח לענות לכל שאלה ובקשה.</p>

        {/* קו דקורטיבי */}
        <div className="mt-3 h-[3px] w-20 bg-gradient-to-l from-blue-600 to-pink-500 rounded-full ml-auto" />
      </div>

      {/* כפתור וואטסאפ */}
      <div className="mt-4 flex justify-start">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-green-600 px-4 py-2
                       text-green-700 hover:bg-green-50 active:scale-[0.99] transition"
          aria-label="פתיחת צ'אט ב־WhatsApp"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
          <span className="font-semibold">דברו איתנו ב־WhatsApp</span>
        </a>
      </div>
      <div className="mt-6 text-black font-bold">
        <h3>או</h3>
      </div>
      <div
        className="flex flex-row relative w-[90%] max-w-5xl items-center justify-center
                   mt-2 sm:mt-4 px-4 sm:px-6 py-1"
      >
        <ContactForm />
      </div>
    </div>
  );
}
