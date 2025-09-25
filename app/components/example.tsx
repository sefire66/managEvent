import { METHODS } from "http";

// ======================================
// פונקציה ששומרת תחום
// const clamp = (x: number, min = 0, max = 100) => Math.min(max, Math.max(min, x));
// ==end======================================

//import { reverseDateOrder } from "../utilityFunctions/dateFunctions";
// import { useSession } from "next-auth/react";

{
  /*======== מפריד עדין ===============/
}
<div className="my-8 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />;

{
  /* =======sms refresh============================== */
}
//  style={{ cursor: "pointer" }}
{
  /* <button
        onClick={() => setSmsRefreshKey((k) => k + 1)}
        className="px-2 py-1 text-xs border rounded"
      >
        bump refreshKey
      </button>

      <div className="mb-2 text-xs text-gray-600" dir="ltr">
        refreshKey: <span className="font-mono font-bold">{smsRefreshKey}</span>
      </div> */
}
// ordered by table number
// {(tables || [])
//    .slice() // 🟧 יוצרים עותק כדי לא לשנות את המערך המקורי
//    .sort((a, b) => parseInt(a.number) - parseInt(b.number)) // 🟧 ממיינים לפי המספר
//   .map((table) => {
//     console.log("🔍 Table number:", table.number);
//     console.log(
//       "📋 Guests at this table:",
//       guests.filter((g) => g.table === table.number)
//     );

// מיון לפי שם/מחרוזת
// guest.sort((a, b) => a.name.localeCompare(b.name))

// add usere to scroll to selected table
// 🟧 import React, { useEffect, useRef } from "react";
// const selectedRef = useRef<HTMLDivElement | null>(null);
// 🟧 useEffect(() => {
// 🟧   if (selectedRef.current) {
// 🟧     selectedRef.current.scrollIntoView({
// 🟧       behavior: "smooth",
// 🟧       block: "center",
// 🟧     });
// 🟧   }
// 🟧 }, [selectedTableNumber]);

{
  /* תמונה ממוזערת + כפתור העלאה
        {!isOpen && event && imageToShow && (
          <div className="max-h-[80px] overflow-hidden rounded-lg border ">
            <img
              src={imageToShow}
              alt="תמונת הארוע"
              className="w-[100px] h-[80px] object-cover rounded"
            />
          </div>
        )} */
}
// {uploading ? "מעלה... " : "העלה תמונה"}

// ===================================================
// "use client";
// grid 3 עמודות: 180px | גמיש | 140px
// export default function Grid3Skeleton() {
//   return (
//     <div className="max-w-5xl mx-auto p-4" dir="rtl">
//       {/* גריד 3 עמודות: 180px | גמיש | 140px */}
//       <div className="
//         grid grid-cols-1 md:grid-cols-[180px_1fr_140px] gap-4 items-start
//         border border-gray-300 rounded-md shadow p-3
//       ">
//         {/* עמודה 1 – כותרת/טקסט קצר */}
//         <div className="text-right">כאן משפט קצר לעמודה 1.</div>

//         {/* עמודה 2 – תוכן/פירוט */}
//         <div className="text-right">כאן משפט קצר לעמודה 2.</div>

//         {/* עמודה 3 – פעולה/כפתור/טקסט */}
//         <div className="text-right">כאן משפט קצר לעמודה 3.</div>
//       </div>
//     </div>
//   );
// }

// שלוש עמודות שוות
// grid grid-cols-1 md:grid-cols-3

/*=====================================  */
/*=====================================  */
/*{" "}
        <button
          onClick={() => setSmsRefreshKey1((k) => k + 1)}
          className="px-2 py-1 text-xs border rounded"
        >
          bump refreshKey1
        </button>
        <div className="mb-2 text-xs text-gray-600" dir="ltr">
          smsRefreshKey1:{" "}
          <span className="font-mono font-bold">{smsRefreshKey1}</span>
        </div>{" "}
        */

/*=====================================  */

//  <div className="mb-2 text-xs text-gray-600" dir="ltr">
//         eventID: <span className="font-mono font-bold">{eventId}</span>
//       </div>

// מכניס תאריך אחרון למערך
/*
   const map: Record<string, string | null> = {};
        (data || []).forEach((row) => {
          if (row.status !== "sent") return;
          const gid = String(row.guestPhone);
          const cur = new Date(row.sentAt);
          const prevIso = map[gid];
          const prev = prevIso ? new Date(prevIso) : null;
          if (!prev || cur > prev) map[gid] = cur.toISOString();
        });
        */
// .includes method
// [1, 2, 3].includes(2);        // true
// [NaN].includes(NaN);          // true
// "abc".includes("b");          // true
// "abc".includes("B");          // false (רגיש לאותיות)
// [ {a:1} ].includes({a:1});    // false (השוואת רפרנס באובייקטים)

// how to check if field is in the array "requiredFieldsMap"=====================

//  const requiredFieldsMap: Record<string, (keyof EventDetails)[]> = {
//     חתונה: [
//       "brideFirst",
//       "brideLast",
//       "groomFirst",
//       "groomLast",
//       "date",
//       "time",
//       "venue",
//       "address",
//     ],
//     "בר מצווה": ["groomFirst", "groomLast", "date", "time", "venue", "address"],
//     "בת מצווה": ["brideFirst", "brideLast", "date", "time", "venue", "address"],
//     "יום הולדת": [
//       "brideFirst",
//       "brideLast",
//       "date",
//       "venue",
//       "time",
//       "address",
//     ],
//     "אירוע עסקי": [
//       "brideFirst",
//       "brideLast",
//       "date",
//       "time",
//       "venue",
//       "address",
//     ],
//   };

// const isRequired =
//   isRequiredProp ??
//   ((field: string) => {
//     const required = requiredFieldsMap[details.eventType || ""];
//     return required?.includes(field as keyof EventDetails) ?? false;
//   });

// =================ערך התחלתי באוביקט=============================
// const initialSkip: Record<SmsType, boolean> = {
//     saveDate: true,
//     invitation: true,
//     reminder: true,
//     tableNumber: true,
//     thankYou: true,
//     cancel: true,
//   };
//   const [skipAlreadyByType, setSkipAlreadyByType] = useState(initialSkip);

// ============================================
// ===בחירה מתוך מפה או רשימה ===============
// =========================================
// // מפת תמונות
// const defaultImageMap: Record<string, string> = {
//   חתונה: "/images/wedding-3d.jpg",
//   חינה: "/images/wedding-3d.jpg", // ← חדש
//   "בר מצווה": "/images/jewish.jpg",
//   "בת מצווה": "/images/birthday-3d.jpg",
//   "יום הולדת": "/images/birthday-3d.jpg",
//   "אירוע עסקי": "/images/buisiness-3d.jpg",
//   ברית: "/images/baby-3d.jpg",
//   בריתה: "/images/baby-3d.jpg",
// };

// const eventTypeKey = event.eventType?.trim() || "";
// const imageToShow =
//   event.imageUrl ||
//   (eventTypeKey ? defaultImageMap[eventTypeKey] : undefined) ||
//   "/images/wedding-3d.jpg"; // עדיף fallback כללי; ודא שהנתיב קיים

//  <div className="flex items-center justify-center w-full rounded-xl overflow-hidden mt-2 mb-2  h-[54svh] sm:h-[90svh]  ">
//       <img
//         src={imageToShow}
//         alt="תמונת האירוע"
//         className="w-full h-full  object-cover "
//       />
//     </div>
// -----------------------------------------------
// ===============================================
// בודק אם מחרוזת נמצאת ומחזיר אמת או שקר
// ==============================================
// ["אירוע עסקי", "ארוע עסקי"].includes((event.eventType ?? "").trim())
// -----------------------------------------------

//    return `שלום ${name},

// תודה שהשתתפתם ב${thanyouBrit || titleForThankYou}!${
//         ["אירוע עסקי", "ארוע עסקי"].includes((event.eventType ?? "").trim())
//           ? ""
//           : `

// היה לנו לעונג לחגוג איתכם.
// ${getFamilySignature(event)}`
//       }`.trim();
//     }

// ==============================================
// compact mode for forms - max width 120px for inputs
// ==============================================

// return (
//   <div className="border rounded-lg p-3 bg-gray-50 compact" dir="rtl">
//     {/* ... כל התוכן הקיים ... */}

//     <style jsx>{`
//       .compact input[type="text"],
//       .compact input[type="number"],
//       .compact input[type="email"],
//       .compact input[type="date"],
//       .compact input[type="datetime-local"],
//       .compact select,
//       .compact textarea {
//         max-width: 120px; /* עד 120px */
//         width: 100%; /* יתפסו עד המקסימום */
//       }
//     `}</style>
//   </div>
// );
