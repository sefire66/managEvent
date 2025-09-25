"use client";

import React, { useEffect, useState, useMemo } from "react";
import GuestsList from "./GuestsList";
import TableList from "./TableList";
import type { Guest } from "../types/types";
import { v4 as uuidv4 } from "uuid";

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

import { Button } from "./ui/button";
import NewGuestModal from "./NewGuestModal";
// ==================migrate to databadase from local storage=================

import { useSession } from "next-auth/react";

import {
  prepareGuestPreview,
  filterValidGuests,
  GuestRow,
} from "../utilityFunctions/guestImportUtils";
import type { Table } from "../types/types";
import EditTableDialog from "./EditTableDialog";
import EditGuestDialog from "./EditGuestDialog";
import MoveGuestDialog from "./MoveGuestDialog";
// בתוך הקומפוננטה שלך

import TableDashboard from "./TableDashboard"; // הנתיב לפי המיקום שלך
import GuestListDashboard from "./GuestListDashboard";

// =============================
import type { EventDetails } from "../types/types";

interface GuestListManagerProps {
  guestsList: Guest[];
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>;
  eventDetails: EventDetails; // ← הוספה כאן
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
  eventDetails,
}: GuestListManagerProps) => {
  const [previewRows, setPreviewRows] = useState<GuestRow[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // =======================================
  // =======================================
  // ==move guest to another table==========
  //  ======STATE===========================
  //  ======================================
  const [movingGuest, setMovingGuest] = useState<Guest | null>(null);
  const [showMoveGuestModal, setShowMoveGuestModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // =======================================
  // === END move guest to another table====
  // =======================================

  const [tables, setTables] = useState<Table[]>([]);
  const [shortView, setShortView] = useState(false);
  const toggleShortView = () => {
    setShortView((prev) => !prev);
  };

  const handleAddTable = () => {
    const maxNumber = Math.max(
      0,
      ...tables.map((t) => parseInt(t.number) || 0)
    );

    setSelectedTable({
      number: String(maxNumber + 1),
      totalSeats: 12,
      note: "",
    });
  };

  // =====================

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // ====this is for the delete guest ===============
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  // ===================================================
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const OpenEditGuest = (guest: Guest | null) => {
    setSelectedGuest(guest);
  };

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

  // const [message, setMessage] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");

  const [filters, setFilters] = useState<FilterState>({
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  });
  const [error, setError] = useState<string>("");
  // ==========clear guestlist on logout
  useEffect(() => {
    if (!session) {
      setGuestsList([]);
      setDisplayList([]);
    }
  }, [session]);

  // ======================fetch data from database =================
  useEffect(() => {
    const fetchGuests = async () => {
      if (!session?.user?.email) return;
      try {
        const res = await fetch(`/api/guests?email=${session.user.email}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("❌ Guest API returned invalid data:", data);
          setGuestsList([]); // כדי שלא יתרסק
          return;
        }

        setGuestsList(data);
        setDisplayList(data);
      } catch (error) {
        console.error("Failed to fetch guest list:", error);
        setGuestsList([]);
        setDisplayList([]);
      }
    };

    fetchGuests();
  }, [session]);

  // ======================End fetch from database =================
  // console.log("Guests FROM DATABASE:", guestsList);
  // ============================================================

  // ============================================
  //   save the guestlist to the the database
  // =================================================
  const updateGuests = async (newGuests: Guest[]) => {
    setGuestsList(newGuests);

    if (session?.user?.email) {
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
  // ==================================================================

  // ==================================================================
  const addGuestFromModal = () => {
    console.log("➕ Guest to add:", newGuest);

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
      _id: uuidv4(),
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
      guest._id === id ? { ...guest, ...updatedGuest } : guest
    );

    console.log("Updating guests:  ", id, updatedGuest);
    console.log("Guests after map:", updatedGuests);
    updateGuests(updatedGuests); // ✅ Save updated list to DB
    setGuestsList(updatedGuests);

    if (sortActive) {
      const updatedDisplay = displayList.map((guest) =>
        guest._id === id ? { ...guest, ...updatedGuest } : guest
      );
      setDisplayList(updatedDisplay);
    } else {
      setDisplayList(updatedGuests);
    }
  };

  const deleteGuest = (id: string) => {
    const updatedGuests = guestsList.filter((guest) => guest._id !== id);
    updateGuests(updatedGuests);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { guests, tables } = await importGuestListFromExcel(file);

    const hasErrors = guests.some((row) => row.isInvalid || row.isDuplicate);

    if (hasErrors) {
      setPreviewRows(guests);
      setShowPreviewDialog(true);
    } else {
      // שמירת אורחים
      await updateGuests(guests);

      console.log("📨 Sending tables with email:", session?.user?.email);
      console.log("🚀 Tables to send:", tables);

      // =======================================
      // ===שמירה של שולחנות מרשימת אקסל======
      // =======================================

      try {
        const response = await fetch("/api/tables/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session?.user?.email,
            tables: tables,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("❌ Failed to save tables:", error);
        } else {
          const savedTables = await response.json();
          const sortedTables = savedTables.sort(
            (a: Table, b: Table) => parseInt(a.number) - parseInt(b.number)
          );
          setTables(sortedTables);
        }
      } catch (err) {
        console.error("🚨 Error saving tables:", err);
      }

      // ========================================================
      // ==================== סוף שמירה של שולחנות מאקסל=======
      // ========================================================

      setMessageText(
        `${guests.length} אורחים ו-${tables.length} שולחנות נוספו בהצלחה.`
      );

      setMessageDialogOpen(true);
    }

    e.target.value = ""; // reset file input
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
    const safeDisplay = Array.isArray(displayList) ? displayList : [];

    return safeDisplay.filter((guest) => {
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
  //  ============================================
  // ===== delete confirmatin delete==========
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // =======================================================
  const loadTables = async (email: string) => {
    const res = await fetch(`/api/tables?email=${email}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("❌ Tables API returned invalid data:", data);
      setTables([]);
      return;
    }

    setTables(data);
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadTables(session.user.email);
    }
  }, [session]);

  // ===================================================
  // =========שמירה של שולחן אחד מהמסך=================
  // ==================================================

  const saveTablesToDB = async (tables: Table[], email: string) => {
    if (!email) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, email }),
    });
  };

  const handleSaveTable = (updatedTable: Table) => {
    setTables((prev) => {
      // מסנן את השולחן אם כבר קיים
      const withoutCurrent = prev.filter(
        (t) => t.number !== updatedTable.number
      );

      // מוסיף את השולחן החדש
      const updated = [...withoutCurrent, updatedTable];

      // ממיין לפי מספר (בהנחה שהמספרים הם מחרוזות כמו "1", "2", "10")
      const sorted = updated.sort(
        (a, b) => parseInt(a.number) - parseInt(b.number)
      );

      // שמירה ל־state ול־DB
      saveTablesToDB(sorted, session?.user?.email || "");
      return sorted;
    });

    setSelectedTable(null);
  };

  const handleDeleteTable = (tableNumber: string) => {
    const updated = tables.filter((t) => t.number !== tableNumber);
    setTables(updated);
    saveTablesToDB(updated, session?.user?.email || "");
  };

  return (
    <div
      id="guest-section"
      className="
      flex flex-col justify-around 
      space-y-4 p-4 bg-white rounded-xl shadow w-full
      "
      // space-y-4 p-4 bg-white rounded-xl shadow w-full
    >
      <h2 className="text-xl font-bold text-blue-700 text-center">
        ניהול מוזמנים
      </h2>
      <GuestListDashboard guestList={guestsList} />
      <GuestStats
        guestList={guestsList}
        filters={filters}
        setFilters={setFilters}
      />

      {/* ========this section for uploading from excel with errors======= */}

      {showPreviewDialog && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl  ">
            <DialogHeader>
              <DialogTitle>תצוגה מקדימה של קובץ האורחים</DialogTitle>
            </DialogHeader>
            <p className="text-[16px] text-gray-600 mb-1">
              נא לבדוק את השורות הבאות לפני העלאה. שורות לא תקינות או כפולות לא
              יעלו.{" "}
            </p>
            <div
              className="flex flex-col items-end text-xs text-gray-700 mb-1"
              style={{ direction: "ltr" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>שגויות – חסר שם או טלפון לא תקין</span>
                <div className="w-4 h-4 bg-yellow-300 border border-gray-400 rounded-sm"></div>
              </div>
              <div className="flex items-center gap-2 ">
                <span>כפולות – מספר טלפון חוזר</span>
                <div className="w-4 h-4 bg-red-300 border border-gray-400 rounded-sm"></div>
              </div>
            </div>

            <div className=" max-h-[300px] overflow-y-auto  text-xs border border-gray-300 rounded-md">
              <table className="w-full text-right border-separate border-spacing-0 ">
                <thead className="sticky top-0 bg-white shadow z-10">
                  <tr className="bg-gray-100 text-sm">
                    <th className="p-2  border-b">שם</th>
                    <th className="p-0.5  border-b text-center">טלפון</th>
                    <th className="p-0.5  border-b text-center">סטטוס</th>
                    <th className="p-0.5  border-b text-center">משתתפים</th>
                    <th className="p-0.5  border-b text-center">שולחן</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((guest, i) => (
                    <tr
                      key={i}
                      className={`text-[14px]  ${
                        guest.isInvalid
                          ? "bg-yellow-300"
                          : guest.isDuplicate
                          ? "bg-red-100"
                          : ""
                      }`}
                    >
                      <td className="p-0.5 px-2 h-4 ">{guest.name}</td>
                      <td className="p-0.5 h-4 text-center">{guest.phone}</td>
                      <td className="p-0.5 h-4 text-center">{guest.status}</td>
                      <td className="p-0.5 h-4 text-center">{guest.count}</td>
                      <td className="p-0.5 h-4 text-center">{guest.table}</td>
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
                  // setMessage(
                  //   ${valid.length} אורחים נוספו. שורות שגויות/כפולות דולגו.
                  // );
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
      {/* ========End section for uploading from excel with errors============= */}

      {/* מסך לחצנים */}
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
      {/*  סוף מסך לחצנים סוף*/}

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

      {/* התחלת רשימת אורחים  */}
      <div
        className="min-h-[200px] transition-all flex flex-col justify-center bg-yellow-50  border w-full  "
        style={{ direction: "rtl" }}
      >
        <GuestsList
          // guestsList={filteredList}
          guestsList={guestsList}
          updateGuest={updateGuest}
          deleteGuest={deleteGuest}
          openEditGuest={OpenEditGuest}
          tables={tables}
        />
      </div>
      {/* סוף רשימת אורחים  */}

      {/*==== תחילת רשימת שולחנות =====*/}

      <TableDashboard tables={tables} guests={guestsList} />

      {/* ====== רשימת שולחנות  */}
      {successMessage && (
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-4 text-sm text-right shadow">
          {successMessage}
        </div>
      )}

      <TableList
        tables={tables}
        guests={guestsList}
        onEditTable={(table) => setSelectedTable(table)}
        onAddTable={handleAddTable}
        shortView={shortView}
        toggleShortView={toggleShortView}
        onGuestClick={(guest) => {
          setMovingGuest(guest);
          setShowMoveGuestModal(true);
        }}
      />

      {/*===END  סוף רשימת שולחנות */}

      <EditTableDialog
        table={selectedTable}
        guests={guestsList}
        onClose={() => setSelectedTable(null)}
        onSave={handleSaveTable}
        onDelete={handleDeleteTable}
        // isNew={!tables.some((t) => t.number === selectedTable?.number)}
        isNew={
          selectedTable
            ? !tables.some((t) => t.number === selectedTable.number)
            : true
        }
        existingTables={tables}
      />

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

      {/* ========הודעות כלליות==================== */}

      <MessageDialog
        open={messageDialogOpen}
        message={messageText}
        onConfirm={() => setMessageDialogOpen(false)}
      />
      {/* ======סוף הודעות כלליות================= */}

      {/* ======עריכת אורח עי מודל================ */}
      <EditGuestDialog
        guest={selectedGuest}
        onClose={() => setSelectedGuest(null)}
        onSave={(updated) => updateGuest(updated._id, updated)}
        onDelete={deleteGuest}
        tables={tables} // ← רשימת השולחנות
        guests={guestsList}
      />
      {/* ==================================== */}
      {/* =======העברת אורח לשולחן אחר====== */}
      {/* ==================================== */}

      {movingGuest && showMoveGuestModal && (
        <MoveGuestDialog
          guest={movingGuest}
          tables={tables}
          guests={guestsList}
          onClose={() => setShowMoveGuestModal(false)}
          onMove={(guest, newTableNumber) => {
            const updatedGuests = guestsList.map((g) =>
              g._id === guest._id ? { ...g, table: newTableNumber } : g
            );
            updateGuests(updatedGuests); // כבר יש לך את הפונקציה הזו

            // ==============================
            // ===הודעת הצלחה להעברת אורח==
            // ==============================
            if (guest.table !== newTableNumber) {
              setSuccessMessage(
                `✅ ${guest.name} עבר משולחן ${
                  guest.table || "לא משויך"
                } לשולחן ${newTableNumber}`
              );

              setTimeout(() => setSuccessMessage(""), 4000); // נעלם אחרי 4 שניות
            }
            // ================================
            // =END==הודעת הצלחה להעברת אורח=
            // ================================
          }}
        />
      )}

      {/* ==END==העברת אורח לשולחן אחר====== */}
    </div>
  );
};

export default GuestListManager;
