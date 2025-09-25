import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";
import { Guest } from "../types/types";

// סטטוסים תקפים
const allowedStatuses = ["לא ענה", "בא", "לא בא", "אולי"] as const;

// ניקוי סטטוס
function sanitizeStatus(status: any): Guest["status"] {
  const trimmed = String(status || "").trim();
  return allowedStatuses.includes(trimmed as Guest["status"])
    ? (trimmed as Guest["status"])
    : "לא ענה";
}

// אימות טלפון ישראלי
const isValidPhone = (phone: string): boolean => {
  return /^05\d{8}$/.test(phone);
};

// ייבוא האורחים מקובץ Excel
export async function importGuestListFromExcel(file: File): Promise<{
  guests: (Guest & {
    isInvalid: boolean;
    isDuplicate: boolean;
  })[];
  tables: {
    tableNumber: string;
    totalSeats: number;
    guests: string[];
  }[];
}> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  const guests: (Guest & { isInvalid: boolean; isDuplicate: boolean })[] = [];
  const seenPhones = new Set<string>();

  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // דילוג על שורת כותרת

    const name = String(row.getCell(1).value || "").trim(); // עמודה A
    const phone = String(row.getCell(2).value || "").trim(); // עמודה B
    const statusRaw = row.getCell(3).value; // עמודה C
    const countRaw = row.getCell(4).value; // עמודה D (כמות)
    const table = String(row.getCell(5).value || "").trim(); // עמודה E

    const count = parseInt(String(countRaw || "").trim(), 10);

    // קביעה סופית של סטטוס
    const sanitizedStatus = sanitizeStatus(statusRaw);
    const status = count > 0 ? "בא" : sanitizedStatus;

    // אם סטטוס "בא" ואין כמות → ברירת מחדל 1
    const finalCount =
      status === "בא"
        ? isNaN(count) || count === 0
          ? 1
          : count
        : isNaN(count)
        ? undefined
        : count;

    const phoneIsValid = isValidPhone(phone);
    const isDuplicate = seenPhones.has(phone);

    guests.push({
      _id: uuidv4(),
      name,
      phone,
      status,
      table,
      count: finalCount,
      smsCount: 0,
      lastSms: "",
      isInvalid: !name || !phoneIsValid,
      isDuplicate,
    });

    if (!isDuplicate) {
      seenPhones.add(phone);
    }
  });

  // יצירת טבלת שולחנות מתוך האורחים
  const tablesMap = new Map<
    string,
    { tableNumber: string; totalSeats: number; guests: string[] }
  >();

  for (const guest of guests) {
    if (guest.table && guest.status === "בא") {
      if (!tablesMap.has(guest.table)) {
        tablesMap.set(guest.table, {
          tableNumber: guest.table,
          totalSeats: 8, // אפשר גם להתאים אוטומטית בעתיד
          guests: [],
        });
      }
      tablesMap.get(guest.table)!.guests.push(guest._id);
    }
  }

  const tables = Array.from(tablesMap.values());

  return { guests, tables };
}
