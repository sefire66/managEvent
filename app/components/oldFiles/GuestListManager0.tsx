"use client";

import React, { useEffect, useState, useMemo } from "react";
import GuestsList from "../GuestsList";
import type { Guest } from "../../types/types";
import { v4 as uuidv4 } from "uuid";
import ExcelJS from "exceljs";

import GuestStats from "../GuestStats";
import GuestListFilter from "../GuestListFilter";
import GuestListToolbar from "../GuestListToolbar";

interface GuestListManagerProps {
  guestsList: Guest[];
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>;
}

type FilterState = {
  name: string;
  phone: string;
  status: string;
  count: string;
  table: string;
};

const GuestListManager = ({
  guestsList,
  setGuestsList,
}: GuestListManagerProps) => {
  useEffect(() => {
    const storedGuests = localStorage.getItem("guestList");
    if (storedGuests) {
      setGuestsList(JSON.parse(storedGuests));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("guestList", JSON.stringify(guestsList));
  }, [guestsList]);

  const addGuest = () => {
    const newGuest: Guest = {
      id: uuidv4(),
      name: "",
      phone: "",
      status: "לא ענה",
      count: undefined,
      table: "",
      smsCount: 0,
      lastSms: "",
    };
    setGuestsList((prev) => [newGuest, ...prev]);
  };

  const updateGuest = (id: string, updatedGuest: Partial<Guest>) => {
    setGuestsList((prev) =>
      prev.map((guest) =>
        guest.id === id ? { ...guest, ...updatedGuest } : guest
      )
    );
  };

  const deleteGuest = (id: string) => {
    setGuestsList((prev) => prev.filter((guest) => guest.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) return;

      const newGuests: Guest[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const name = String(row.getCell(1).value || "").trim();
        const phone = String(row.getCell(2).value || "").trim();
        const status = String(row.getCell(3).value || "").trim();
        const count = parseInt(String(row.getCell(4).value || "0").trim());
        const table = String(row.getCell(5).value || "").trim();

        const allowedStatuses = ["לא ענה", "בא", "לא בא", "אולי בא"] as const;
        const validStatus = allowedStatuses.includes(status as any)
          ? (status as (typeof allowedStatuses)[number])
          : "לא ענה";

        if (!name && !phone) return;

        newGuests.push({
          id: uuidv4(),
          name,
          phone,
          status: validStatus,
          count: isNaN(count) ? undefined : count,
          table,
          smsCount: 0,
          lastSms: "",
        });
      });

      localStorage.setItem("guestList", JSON.stringify(newGuests));
      setGuestsList(newGuests);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const exportGuestListToExcel = async (guestsList: Guest[]) => {
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

  const defaultFilters: FilterState = {
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  };

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [sortField, setSortField] = useState<keyof Guest>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Guest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedGuests = useMemo(() => {
    const filtered = showFilter
      ? guestsList.filter((guest) => {
          return (
            guest.name.includes(filters.name) &&
            guest.phone.includes(filters.phone) &&
            (filters.status ? guest.status === filters.status : true) &&
            (filters.count
              ? String(guest.count ?? "") === filters.count
              : true) &&
            guest.table.includes(filters.table)
          );
        })
      : guestsList;

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (sortField === "count") {
        return sortOrder === "asc"
          ? Number(aVal ?? 0) - Number(bVal ?? 0)
          : Number(bVal ?? 0) - Number(aVal ?? 0);
      }

      if (sortField === "table") {
        const aNum = parseInt(String(aVal)) || 0;
        const bNum = parseInt(String(bVal)) || 0;
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [guestsList, filters, sortField, sortOrder, showFilter]);

  return (
    <div className="space-y-4 p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold text-blue-700 text-center">
        ניהול מוזמנים
      </h2>

      <GuestStats guestList={guestsList} />

      <GuestListToolbar
        onAddGuest={addGuest}
        onImportGuests={handleFileUpload}
        onExportGuests={() => exportGuestListToExcel(guestsList)}
        onToggleFilter={() => {
          if (showFilter) setFilters(defaultFilters);
          setShowFilter(!showFilter);
        }}
        showFilter={showFilter}
      />

      {showFilter && (
        <GuestListFilter
          filters={filters}
          setFilters={setFilters}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}

      <div className="min-h-[400px] transition-all ">
        <GuestsList
          guestsList={filteredAndSortedGuests}
          updateGuest={updateGuest}
          deleteGuest={deleteGuest}
        />
      </div>
    </div>
  );
};

export default GuestListManager;
