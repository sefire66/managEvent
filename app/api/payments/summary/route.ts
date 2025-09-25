// app/api/payments/summary/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

/**
 * עוזר: מחזיר מערך של מזהי חודשים "YYYY-MM" ב־Asia/Jerusalem
 * idx=0 -> חודש נוכחי, 1-> קודם, 2-> קודם-קודם, ...
 */
function getYmListAsiaJerusalem(count: number) {
  const tz = "Asia/Jerusalem";
  const list: string[] = [];
  const base = new Date(); // עכשיו (UTC), הפורמט נעשה עם timezone
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime());
    // מזיזים חודשים ב-UTC כדי להימנע מזיגזוגי DST; הפורמט יקח timeZone בחשבון
    d.setUTCMonth(d.getUTCMonth() - i);

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(d);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    if (!y || !m) continue;
    list.push(`${y}-${m}`); // "YYYY-MM"
  }
  return list;
}

/**
 * תגיות ידידותיות (עברית) לחודשים
 */
function labelHebForYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "long",
  }); // למשל "ספטמבר 2025"
}

export async function GET(req: Request) {
  try {
    // הרשאות: רק admin/super-admin
    const session = await getServerSession(authOptions);
    const role = (session as any)?.user?.role as string | undefined;
    if (!session || !role || !["admin", "super-admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    // N = מספר חודשים מלאים אחרונים (ללא החודש העכשווי) לחישוב rolling
    const monthsParam = searchParams.get("months");
    const N = Math.max(1, Math.min(36, Number(monthsParam) || 2)); // ברירת מחדל 2

    await connectToDatabase();

    // ניקח את החודשים שנצטרך: חודש נוכחי + 2 אחורה + N מלאים (אולי חופף)
    // כדי לא לפספס, נבקש למשל N + 3 חודשים אחורה ונקבץ במאגר.
    const neededYms = getYmListAsiaJerusalem(N + 3); // [current, last, prev, ...N more]

    // נבנה אגרגציה:
    // 1) moneyAmount != 0 (תשלומים "אמיתיים")
    // 2) נוסיף שדה ym = "YYYY-MM" לפי createdAt עם timezone Asia/Jerusalem
    // 3) נסנן רק ל-ym שאנחנו צריכים
    // 4) נקבץ לפי ym עם sum + count
    const pipeline = [
      { $match: { moneyAmount: { $ne: 0 } } },
      {
        $addFields: {
          ym: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "Asia/Jerusalem",
            },
          },
        },
      },
      { $match: { ym: { $in: neededYms } } },
      {
        $group: {
          _id: "$ym",
          sum: { $sum: "$moneyAmount" },
          count: { $sum: 1 },
        },
      },
    ] as any[];

    const rows = (await Payment.aggregate(pipeline)) as Array<{
      _id: string; // ym
      sum: number;
      count: number;
    }>;

    // נמפה לתוך map לנגישות
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of rows) {
      map.set(r._id, { sum: r.sum ?? 0, count: r.count ?? 0 });
    }

    // שלושת החודשים לתצוגת-על: current, last, prev
    const [currentYm, lastYm, prevYm] = neededYms.slice(0, 3); // 0=current,1=last,2=prev

    const currentMonth = {
      ym: currentYm,
      label: labelHebForYm(currentYm),
      sum: map.get(currentYm)?.sum ?? 0,
      count: map.get(currentYm)?.count ?? 0,
    };
    const lastMonth = {
      ym: lastYm,
      label: labelHebForYm(lastYm),
      sum: map.get(lastYm)?.sum ?? 0,
      count: map.get(lastYm)?.count ?? 0,
    };
    const prevMonth = {
      ym: prevYm,
      label: labelHebForYm(prevYm),
      sum: map.get(prevYm)?.sum ?? 0,
      count: map.get(prevYm)?.count ?? 0,
    };

    // rolling של N חודשים מלאים: *ללא* החודש הנוכחי
    const fullMonthsList = neededYms.slice(1, 1 + N); // מתחיל מהחודש הקודם, N פריטים
    let rollingSum = 0;
    let rollingCount = 0;
    for (const ym of fullMonthsList) {
      const r = map.get(ym);
      if (r) {
        rollingSum += r.sum ?? 0;
        rollingCount += r.count ?? 0;
      }
    }

    // תווית טווח (אופציונלית, נוחה להצגה)
    const rollingLabel =
      fullMonthsList.length > 1
        ? `${labelHebForYm(fullMonthsList[fullMonthsList.length - 1])} – ${labelHebForYm(fullMonthsList[0])}`
        : fullMonthsList.length === 1
          ? labelHebForYm(fullMonthsList[0])
          : "";

    return NextResponse.json({
      ok: true,
      timezone: "Asia/Jerusalem",
      monthsRequested: N,
      currentMonth,
      lastMonth,
      prevMonth,
      rolling: {
        months: N,
        sum: rollingSum,
        count: rollingCount,
        fromYm:
          fullMonthsList.length > 0
            ? fullMonthsList[fullMonthsList.length - 1]
            : null,
        toYm: fullMonthsList.length > 0 ? fullMonthsList[0] : null,
        label: rollingLabel,
      },
    });
  } catch (err: any) {
    console.error("payments/summary error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
