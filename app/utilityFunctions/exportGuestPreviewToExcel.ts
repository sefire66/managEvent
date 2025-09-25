import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { GuestRow } from "./guestImportUtils";

export const exportGuestPreviewToExcel = async (guests: GuestRow[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Guests Preview");

  // כותרות
  sheet.addRow([
    "שם",
    "טלפון",
    "סטטוס",
    "שולחן",
    "משתתפים",
    "שגוי?",
    "כפול?",
  ]);



  guests.forEach((guest) => {
    const row = sheet.addRow([
      guest.name,
      guest.phone,
      guest.status,
      guest.table,
      guest.count ?? "",
      guest.isInvalid ? "כן" : "",
      guest.isDuplicate ? "כן" : "",
    ]);

      // Format 'status' cell as text (3rd column = C)
  row.getCell(2).numFmt = "@";
// יצירת כותרות
sheet.columns = [
  { header: "שם", key: "name", width: 20 },
  { header: "טלפון", key: "phone", width: 20 }, // 👈 הרחב את הטור
  { header: "סטטוס", key: "status", width: 12 },
  { header: "משתתפים", key: "count", width: 10 },
   { header: "שולחן", key: "table", width: 10 },
  { header: "שגוי?", key: "isInvalid", width: 10 },
  { header: "כפול?", key: "isDuplicate", width: 10 },
];


// // קיבוע שורת הכותרת
// sheet.views = [{ state: "frozen", ySplit: 1 }];

// עיצוב כותרת
sheet.getRow(1).eachCell((cell) => {
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.font = { bold: true };
  cell.border = {
    top: { style: "thick" },
    left: { style: "thick" },
    bottom: { style: "thick" },
    right: { style: "thick" },
  };
});

 


// צבעים לשגיאות/כפולים
    if (guest.isInvalid) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB3B" }, // צהוב
        };
      });
    }

    if (!guest.isInvalid && guest.isDuplicate) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFCDD2" }, // אדום
        };
      });
    }

 row.eachCell((cell) => {
  cell.alignment = { horizontal: "center", vertical: "middle" };

  // Optional: border
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});



  });

 

  
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "guest-preview.xlsx");
};
