"use client";
import * as XLSX from "xlsx";
import type { Guest } from "../types/types";

const GuestUploader = ({
  onUpload,
}: {
  onUpload: (guests: Guest[]) => void;
}) => {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

      const guests: Guest[] = jsonData.map((row) => ({
        id: row["UUID"] || crypto.randomUUID(),
        phone: row["טלפון"] || "",
        name: row["שם"] || "",
        status: row["סטטוס"] || "לא ענה",
        table: row["שולחן"] || "",
        count: row["כמות"]?.toString() || "0",
        smsCount: 0, // default value
        lastSms: "",
      }));

      onUpload(guests);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 text-center space-y-4">
      <h2 className="text-xl font-bold text-blue-700">העלאת רשימת אורחים</h2>
      <input
        type="file"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleFile}
      />
      <p className="text-sm text-gray-500">הקובץ החדש יחליף את הרשימה הקיימת</p>
    </div>
  );
};

export default GuestUploader;
