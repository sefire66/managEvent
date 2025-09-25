"use client";

import React from "react";
import { DoorOpen, Users, Smile } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const ReceptionTable = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 mt-5 mb-16 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-5 border-blue-500 "
      dir="rtl"
    >
      <div className="flex flex-col md:flex-row items-center gap-10">
        {/* טקסט */}
        <div className="flex-1">
          <div className="text-center md:text-right mb-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-3">
              שולחן קבלת פנים דיגיטלי
            </h2>
            <p className="text-lg sm:text-xl text-gray-700">
              הדרך החכמה לקבל את האורחים שלכם באירוע – עם חווית קבלה דיגיטלית,
              אישית ומעוצבת
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-4 justify-center items-center md:items-start mb-6 text-blue-600 text-lg">
            <div className="flex items-center gap-2">
              <Users size={26} />
              <span>רשימות מוזמנים מסונכרנות</span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen size={26} />
              <span>צ׳ק-אין מהיר ונוח</span>
            </div>
            <div className="flex items-center gap-2">
              <Smile size={26} />
              <span>ברוכים הבאים אישיים לכל אורח</span>
            </div>
          </div>

          <div className="text-center md:text-right">
            <Link
              href="/contactus"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition"
            >
              דברו איתנו על שולחן קבלת פנים
            </Link>
          </div>
        </div>

        {/* תמונה זמנית חדשה */}
        <Image
          src="/images/receptionTable.jpg"
          alt="שולחן קבלת פנים"
          width={200}
          height={200}
          className="rounded-xl shadow-md object-cover"
        />
      </div>
    </section>
  );
};

export default ReceptionTable;
