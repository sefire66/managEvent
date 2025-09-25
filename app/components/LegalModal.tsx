"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LegalModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto text-right">
        <DialogHeader>
          <DialogTitle>תנאי השימוש ומדיניות פרטיות</DialogTitle>
        </DialogHeader>

        <div className="space-y-8 text-sm text-gray-800 leading-relaxed">
          {/* --- תנאי שימוש --- */}
          <section>
            <h2 className="text-xl font-bold mb-2 text-gray-900">תנאי שימוש</h2>

            <h3 className="font-semibold mt-4 mb-1">1. כללי</h3>
            <p>
              בשימושך באתר, הנך מאשר/ת כי קראת והסכמת לתנאים אלו. התנאים חלים על
              כל משתמש או מבקר באתר.
            </p>

            <h3 className="font-semibold mt-4 mb-1">2. שירותי הפלטפורמה</h3>
            <p>
              האתר מאפשר תכנון וניהול אירועים, כולל רשימות אורחים, שליחת SMS,
              RSVP ועוד.
            </p>

            <h3 className="font-semibold mt-4 mb-1">3. שליחת הודעות</h3>
            <p>
              חל איסור על שליחת ספאם או הודעות שיווקיות לא חוקיות. מותר לשלוח רק
              הודעות הקשורות לאירוע שלך.
            </p>

            <h3 className="font-semibold mt-4 mb-1">4. תשלומים</h3>
            <p>
              כל תשלום מתבצע דרך ספק חיצוני. אין לנו גישה לפרטי כרטיס אשראי.
            </p>

            <h3 className="font-semibold mt-4 mb-1">5. אחריות המשתמש</h3>
            <ul className="list-disc mr-5 space-y-1">
              <li>כל המידע שהוזן חייב להיות אמיתי ועדכני.</li>
              <li>אין להעלות תכנים פוגעניים.</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-1">6. הגבלת אחריות</h3>
            <p>
              השירות ניתן כפי שהוא (AS-IS). לא נישא באחריות לנזקים ישירים או
              עקיפים.
            </p>
          </section>

          {/* --- מדיניות פרטיות --- */}
          <section>
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              מדיניות פרטיות
            </h2>

            <h3 className="font-semibold mt-4 mb-1">1. איסוף מידע</h3>
            <p>
              אנו אוספים מידע רק לצורך מתן השירות. לא נשתמש בו למטרות מסחריות.
            </p>

            <h3 className="font-semibold mt-4 mb-1">2. שימוש במידע</h3>
            <p>אנו מתחייבים לא להעביר מידע אישי לצד שלישי ללא הסכמה.</p>

            <h3 className="font-semibold mt-4 mb-1">3. אבטחת מידע</h3>
            <p>אנו משתמשים באמצעים טכנולוגיים מתקדמים לאבטחת המידע.</p>

            <h3 className="font-semibold mt-4 mb-1">4. יצירת קשר</h3>
            <p>
              שאלות? כתבו לנו לכתובת:{" "}
              <a
                href="mailto:eventnceleb@gmail.com"
                className="text-blue-600 underline"
              >
                eventnceleb@gmail.com
              </a>
            </p>
          </section>

          {/* --- סעיפים נוספים --- */}
          <section>
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              סעיפים נוספים
            </h2>
            <p>
              תנאים אלו עשויים להשתנות. שימושך באתר מהווה הסכמה לגרסה המעודכנת.
            </p>
            <p className="mt-2">
              תאריך עדכון אחרון: <span className="font-bold">01.08.2025</span>
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
