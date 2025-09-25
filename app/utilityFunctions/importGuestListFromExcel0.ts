import ExcelJS from "exceljs";
import { GuestWithValidation } from "../types/types";
import { v4 as uuidv4 } from "uuid";

const isValidPhone = (phone: string) => /^05\d{8}$/.test(phone.trim());

export async function importGuestListFromExcel(file: File): Promise<GuestWithValidation[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  const guests: GuestWithValidation[] = [];
  const phoneSet = new Set<string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const name = row.getCell(1).text.trim();
    const phone = row.getCell(2).text.trim();
    const status = row.getCell(3).text.trim() as GuestWithValidation["status"];
    const count = parseInt(row.getCell(4).text.trim());
    const table = row.getCell(5).text.trim();
    

    const guest: GuestWithValidation = {
      id: uuidv4(),
      name,
      phone,
      status: status || "לא ענה",
      table,
      count: isNaN(count) ? undefined : count,
      smsCount: 0,
      lastSms: "",
      isInvalid: !name || !isValidPhone(phone),
      isDuplicate: false, // will update next
    };

    // check for duplicates
    if (phoneSet.has(phone)) {
      guest.isDuplicate = true;
    } else {
      phoneSet.add(phone);
    }

    guests.push(guest);
  });

  return guests;
}
