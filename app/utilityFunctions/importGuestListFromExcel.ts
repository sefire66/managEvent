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
const isValidPhone = (phone: string): boolean => /^05\d{8}$/.test(phone);

// פונקציה ראשית
export async function importGuestListFromExcel(file: File): Promise<{
  guests: (Guest & { isInvalid: boolean; isDuplicate: boolean })[];
  tables: {
    number: string;
    totalSeats: number;
    guests: string[];
  }[];
}> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  const guests: (Guest & { isInvalid: boolean; isDuplicate: boolean })[] = [];
  const seenPhones = new Set<string>();

  worksheet.eachRow((row, index) => {
    if (index === 1) return; // דילוג על שורת כותרת

    const name = String(row.getCell(1).value || "").trim();
    const phone = String(row.getCell(2).value || "").trim();
    const statusRaw = row.getCell(3).value;
    const countRaw = row.getCell(4).value;
    const table = String(row.getCell(5).value || "").trim();

    const count = parseInt(String(countRaw || "").trim(), 10);
    const sanitizedStatus = sanitizeStatus(statusRaw);
    const status = count > 0 ? "בא" : sanitizedStatus;

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

    if (!isDuplicate) seenPhones.add(phone);
  });

  // יצירת שולחנות לפי אורחים
  const tablesMap = new Map<string, {
    number: string;
    totalSeats: number;
    guests: string[];
  }>();

  for (const guest of guests) {
    if (guest.status === "בא" && guest.table) {
      const number = guest.table.trim();
      if (!number) continue;

      if (!tablesMap.has(number)) {
        tablesMap.set(number, {
          number,
          totalSeats: 12,
          guests: [],
        });
      }

      tablesMap.get(number)!.guests.push(guest._id);
    }
  }

  const tables = Array.from(tablesMap.values());

  return { guests, tables };
}
