"use client";

import React, { useEffect, useState, useMemo } from "react";
import GuestsList from "./GuestsList";
import type { Guest } from "../types/types";
import { v4 as uuidv4 } from "uuid";
import ExcelJS from "exceljs";
import { sortGuestList } from "../utilityFunctions/sortGuestList";
import { exportGuestListToExcel } from "../utilityFunctions/exportGuestListToExcel";
import { importGuestListFromExcel } from "../utilityFunctions/importGuestListFromExcel";
import GuestStats from "./GuestStats";
import GuestListFilter from "./GuestListFilter";
import GuestListToolbar from "./GuestListToolbar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import MessageDialog from "./MessageDialog";
import { exportGuestPreviewToExcel } from "../utilityFunctions/exportGuestPreviewToExcel";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import NewGuestModal from "./NewGuestModal";
// ==================migrate to databadase from local storage=================

import { useSession } from "next-auth/react";

import {
  prepareGuestPreview,
  filterValidGuests,
  GuestRow,
} from "../utilityFunctions/guestImportUtils";

// =============================
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
  const [previewRows, setPreviewRows] = useState<GuestRow[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const { data: session } = useSession();
  const [displayList, setDisplayList] = useState<Guest[]>([]);
  const [sortField, setSortField] = useState<keyof Guest | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortActive, setSortActive] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    name: "",
    phone: "",
    status: "לא ענה",
    count: undefined,
    table: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");

  const [pendingGuests, setPendingGuests] = useState<Guest[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  });
  const [error, setError] = useState<string>("");

  // ======================migrate to database from local storage=================
  useEffect(() => {
    const fetchGuests = async () => {
      if (!session?.user?.email) return;

      try {
        const res = await fetch(`/api/guests?email=${session.user.email}`);
        const data = await res.json();
        setGuestsList(data);
        setDisplayList(data);
      } catch (error) {
        console.error("Failed to fetch guest list:", error);
      }
    };

    fetchGuests();
  }, [session]);

  // ======================migrate to database from local storage=================
  const updateGuests = async (newGuests: Guest[]) => {
    setGuestsList(newGuests);

    // Save to DB
    if (session?.user?.email) {
      console.log("Uploading guests:", newGuests);
      console.log("Owner email:", session?.user?.email);

      await fetch("/api/guests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: newGuests,
          ownerEmail: session.user.email,
        }),
      });
    }

    if (sortActive && sortField) {
      const sorted = sortGuestList(newGuests, sortField, sortOrder);
      setDisplayList(sorted);
    } else {
      setDisplayList(newGuests);
    }
  };

  const isValidPhone = (phone: string): boolean => {
    return /^05\d{8}$/.test(phone);
  };

  const addGuestFromModal = () => {
    if (!newGuest.name?.trim()) {
      setError("נא למלא שם");
      return;
    }
    if (!newGuest.phone?.trim()) {
      setError("נא למלא טלפון");
      return;
    }
    if (!isValidPhone(newGuest.phone)) {
      setError("מספר הטלפון חייב להכיל 10 ספרות ולהתחיל ב-05");
      return;
    }

    const guest: Guest = {
      id: uuidv4(),
      name: newGuest.name,
      phone: newGuest.phone,
      status: newGuest.status || "לא ענה",
      count: newGuest.count,
      table: newGuest.table || "",
      smsCount: 0,
      lastSms: "",
    };
    updateGuests([guest, ...guestsList]);
    setShowModal(false);
    setNewGuest({
      name: "",
      phone: "",
      status: "לא ענה",
      count: undefined,
      table: "",
    });
    setError("");
  };

  const updateGuest = (id: string, updatedGuest: Partial<Guest>) => {
    const updatedGuests = guestsList.map((guest) =>
      guest.id === id ? { ...guest, ...updatedGuest } : guest
    );
    setGuestsList(updatedGuests);

    if (sortActive) {
      const updatedDisplay = displayList.map((guest) =>
        guest.id === id ? { ...guest, ...updatedGuest } : guest
      );
      setDisplayList(updatedDisplay);
    } else {
      setDisplayList(updatedGuests);
    }
  };

  const deleteGuest = (id: string) => {
    const updatedGuests = guestsList.filter((guest) => guest.id !== id);
    updateGuests(updatedGuests);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const importedRows = await importGuestListFromExcel(file);

    const hasErrors = importedRows.some(
      (row) => row.isInvalid || row.isDuplicate
    );

    if (hasErrors) {
      setPreviewRows(importedRows);
      setShowPreviewDialog(true);
    } else {
      await updateGuests(importedRows);
      setMessageText(`${importedRows.length} אורחים נוספו בהצלחה.`);
      setMessageDialogOpen(true);
    }

    e.target.value = ""; // reset file input so re-uploading same file works
  };

  const handleConfirmUpload = () => {
    updateGuests(pendingGuests);
    setMessage(`${pendingGuests.length} שורות עלו. שורות לא תקינות נדחו.`);
    setShowConfirmDialog(false);
    setPendingGuests([]);
  };

  const handleSort = (field: keyof Guest) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortField === field && sortOrder === "asc") {
      newOrder = "desc";
    }
    const sorted = sortGuestList(guestsList, field, newOrder);
    setDisplayList(sorted);
    setSortField(field);
    setSortOrder(newOrder);
    setSortActive(true);
  };

  const filteredList = useMemo(() => {
    return displayList.filter((guest) => {
      return (
        guest.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        guest.phone.includes(filters.phone) &&
        (filters.status === "" || guest.status === filters.status) &&
        (filters.count === "" ||
          String(guest.count ?? "").includes(filters.count)) &&
        guest.table.includes(filters.table)
      );
    });
  }, [displayList, filters]);

  return (
    <div
      id="guest-section"
      className="space-y-4 p-4 bg-white rounded-xl shadow "
    >
      <h2 className="text-xl font-bold text-blue-700 text-center">
        ניהול מוזמנים
      </h2>

      <GuestStats
        guestList={guestsList}
        filters={filters}
        setFilters={setFilters}
      />

      {/* ========this section for uploading from excel with errors======= */}

      {showPreviewDialog && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>תצוגה מקדימה של קובץ האורחים</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mb-4">
              נא לבדוק את השורות הבאות לפני העלאה. שורות לא תקינות או כפולות לא
              יעלו.{" "}
            </p>
            <div
              className="flex flex-col items-end text-sm text-gray-700 mb-4"
              style={{ direction: "ltr" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>שגויות – חסר שם או טלפון לא תקין</span>
                <div className="w-4 h-4 bg-yellow-300 border border-gray-400 rounded-sm"></div>
              </div>
              <div className="flex items-center gap-2">
                <span>כפולות – מספר טלפון חוזר</span>
                <div className="w-4 h-4 bg-red-300 border border-gray-400 rounded-sm"></div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto text-sm border border-gray-300 rounded-md">
              <table className="w-full text-right border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white shadow z-10">
                  <tr className="bg-gray-100 text-sm">
                    <th className="p-2 border-b">שם</th>
                    <th className="p-2 border-b">טלפון</th>
                    <th className="p-2 border-b">סטטוס</th>
                    <th className="p-2 border-b">שולחן</th>
                    <th className="p-2 border-b">משתתפים</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((guest, i) => (
                    <tr
                      key={i}
                      className={`text-sm ${
                        guest.isInvalid
                          ? "bg-yellow-100"
                          : guest.isDuplicate
                          ? "bg-red-100"
                          : ""
                      }`}
                    >
                      <td className="p-2">{guest.name}</td>
                      <td className="p-2">{guest.phone}</td>
                      <td className="p-2">{guest.status}</td>
                      <td className="p-2">{guest.table}</td>
                      <td className="p-2">{guest.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewDialog(false);
                  setPreviewRows([]);
                }}
              >
                ביטול
              </Button>
              <Button
                onClick={() => {
                  const valid = filterValidGuests(previewRows);
                  updateGuests(valid);
                  setShowPreviewDialog(false);
                  setPreviewRows([]);
                  setMessage(
                    `${valid.length} אורחים נוספו. שורות שגויות/כפולות דולגו.`
                  );
                }}
              >
                העלה שורות תקינות בלבד
              </Button>
              <Button
                variant="ghost"
                onClick={() => exportGuestPreviewToExcel(previewRows)}
              >
                יצא ל EXCEL
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* ========End section for uploading ftom excel with errors============= */}

      {/* ========dont know if i am using this section======= */}
      {showConfirmDialog && (
        <MessageDialog
          open={showConfirmDialog}
          title="אישור ייבוא"
          message={confirmMessage || "האם להעלות את השורות התקינות?"}
          onConfirm={handleConfirmUpload}
          onCancel={() => {
            setShowConfirmDialog(false);
            setPendingGuests([]);
          }}
        />
      )}

      <div>
        <GuestListToolbar
          onAddGuest={() => setShowModal(true)}
          onImportGuests={handleFileUpload}
          onExportGuests={() =>
            exportGuestListToExcel(sortActive ? displayList : guestsList)
          }
          onToggleFilter={() => setShowFilter((prev) => !prev)}
          showFilter={showFilter}
        />
      </div>

      {/*פתיחת מסך סינון */}
      <div>
        {showFilter && (
          <GuestListFilter
            filters={filters}
            setFilters={setFilters}
            sortField={sortField ?? "name"}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>
      {/*פתיחת מסך סינון סוף */}

      {/*רשימת אורחים  */}
      <div
        className="min-h-[400px] transition-all flex justify-center flex-col bg-yellow-50 border w-full"
        style={{ direction: "rtl" }}
      >
        <GuestsList
          guestsList={filteredList}
          updateGuest={updateGuest}
          deleteGuest={deleteGuest}
        />
      </div>
      {/* סוף רשימת אורחים  */}

      {/* הוספת אורח חדש */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg text-center bg-gray-200  ">
          <DialogHeader>
            <DialogTitle className="text-center">הוספת אורח חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <NewGuestModal
              newGuest={newGuest as Guest}
              setNewGuest={(g) => setNewGuest(g)}
              errors={{ phone: error }}
              setErrors={({ phone }) => setError(phone || "")}
              guestsList={guestsList}
              displayList={displayList}
              onCancel={() => setShowModal(false)}
              onConfirm={addGuestFromModal}
            />
          </div>
          <DialogFooter className="justify-between pt-4">
            {/* <Button variant="outline" onClick={() => setShowModal(false)}>
              בטל
            </Button> */}
            {/* <Button onClick={addGuestFromModal}>הוסף</Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* סוף הוספת אורח חדש */}
      <MessageDialog
        open={messageDialogOpen}
        message={messageText}
        onConfirm={() => setMessageDialogOpen(false)}
      />
    </div>
  );
};

export default GuestListManager;
