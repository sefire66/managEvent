import ExcelJS from "exceljs";
import { Guest } from "../types/types";

export const exportGuestListToExcel = async (guestsList: Guest[]) => {
  try {
    const response = await fetch("/template_guest_list.xlsx");
    if (!response.ok) throw new Error("Failed to load template.");

    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      alert("לא נמצא גיליון לייצוא");
      return;
    }

    for (let i = 2; i <= worksheet.rowCount; i++) {
      worksheet.getRow(i).values = [];
    }

   
   
    worksheet.getRow(1).values = ["שם", "טלפון", "סטטוס", "כמות", "שולחן"];
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thick" },
        bottom: { style: "thick" },
        left: { style: "thick" },
        right: { style: "thick" },
      };
    });

    guestsList.forEach((guest, index) => {
      const row = worksheet.getRow(index + 2);
      row.getCell(1).value = guest.name;
      row.getCell(2).value = guest.phone;
      row.getCell(3).value = guest.status;
      row.getCell(4).value = guest.count ?? "";
      row.getCell(5).value = guest.table;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      row.commit();
    });

    worksheet.getColumn(2).numFmt = "@";
    worksheet.getColumn(2).eachCell((cell) => {
      cell.numFmt = "@";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "רשימת_אורחים.xlsx";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error("Export Error", err);
    alert("שגיאה ביצוא לאקסל");
  }
};
