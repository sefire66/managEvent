import React, { useLayoutEffect, useRef, useState } from "react";
import type { Guest, Table, EventDetails } from "../types/types";
import { useSession } from "next-auth/react";
import TableDashboard from "./TableDashboard";
import TableList from "./TableList";
import EditTableDialog from "./EditTableDialog";
import MoveGuestDialog from "./MoveGuestDialog";
import MessageDialog from "./MessageDialog";

interface TableManagerProps {
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  guestsList: Guest[];
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>;
  eventDetails: EventDetails;
}

const TableManager = ({
  tables,
  setTables,
  guestsList,
  setGuestsList,
  eventDetails,
}: TableManagerProps) => {
  const { data: session } = useSession();

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [shortView, setShortView] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [movingGuest, setMovingGuest] = useState<Guest | null>(null);
  const [showMoveGuestModal, setShowMoveGuestModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const toggleShortView = () => setShortView((prev) => !prev);

  // עיגון ל"כפתור האקורדיון": מודדים top לפני הטוגל ומפצים אחרי הרנדר
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const preToggleBtnTopRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const btn = toggleBtnRef.current;
    const beforeTop = preToggleBtnTopRef.current;
    if (!btn || beforeTop == null) return;

    const afterTop = btn.getBoundingClientRect().top;
    const delta = afterTop - beforeTop;

    // מפצים בסימן הפוך כדי להשאיר את הכפתור באותו מיקום במסך
    if (delta !== 0) {
      window.scrollBy({ top: -delta, behavior: "auto" });
    }

    // אופציונלי: ודא שיש לפחות 20px מהרצפה (אם הכפתור כמעט נדבק לתחתית)
    const guard = 20;
    const gap = window.innerHeight - btn.getBoundingClientRect().bottom;
    if (gap < guard) {
      window.scrollBy({ top: -(guard - gap), behavior: "auto" });
    }

    // איפוס
    preToggleBtnTopRef.current = null;
  }, [isOpen]);

  // ======handleAddTable=========
  const handleAddTable = () => {
    if (!eventDetails?._id) {
      setMessageText("לא ניתן להוסיף שולחן – יש לבחור אירוע תחילה.");
      setMessageDialogOpen(true);
      return;
    }

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

  // ======saveTablesToDB=========
  const saveTablesToDB = async (tables: Table[], email: string) => {
    if (!email) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, email, eventId: eventDetails._id }),
    });
  };

  // ======handleSaveTable========
  const handleSaveTable = (updatedTable: Table) => {
    let updatedTables: Table[] = [];

    setTables((prev) => {
      const withoutCurrent = prev.filter(
        (t) => t.number !== updatedTable.number
      );
      const sorted = [...withoutCurrent, updatedTable].sort(
        (a, b) => parseInt(a.number) - parseInt(b.number)
      );
      updatedTables = sorted;
      return sorted;
    });

    const tablesWithEventId = updatedTables.map((table) => ({
      ...table,
      eventId: eventDetails._id,
    }));

    saveTablesToDB(tablesWithEventId, session?.user?.email || "");

    setSelectedTable(null);
  };

  // ======handleDeleteTable======
  const handleDeleteTable = (tableNumber: string) => {
    const updated = tables.filter((t) => t.number !== tableNumber);
    setTables(updated);
    saveTablesToDB(updated, session?.user?.email || "");
  };

  return (
    // נטרול scroll anchoring בדפדפן באזור הזה כדי למנוע קפיצות
    <div
      className="bg-white p-.5 rounded-2xl max-w-4xl mx-auto w-full mb-16"
      style={{ overflowAnchor: "none" }}
    >
      <button
        ref={toggleBtnRef}
        onClick={() => {
          // שומרים את מיקום הכפתור לפני שינוי ה-DOM
          preToggleBtnTopRef.current =
            toggleBtnRef.current?.getBoundingClientRect().top ?? null;

          // מבצעים את הטוגל (אין גלילות מלאכותיות)
          setIsOpen((p) => !p);
        }}
        style={{ cursor: "pointer" }}
        className={`w-full border border-gray-300 rounded-md shadow p-4 mb-2 text-blue-600 font-bold text-xl text-right transition-all duration-300 ${
          isOpen ? "border-b-4 border-blue-500" : ""
        }`}
        dir="rtl"
      >
        <div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-items-start">
            {/* צד ימין: האייקון + כותרת */}
            <div className="flex flex-row items-center gap-2">
              <div
                className={`text-2xl transform transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                {isOpen ? "−" : "+"}
              </div>
              <div className="min-w-[180px]">ניהול שולחנות</div>
            </div>

            <div>
              <TableDashboard tables={tables} guests={guestsList} />
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <>
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
            successMessage={successMessage}
          />

          <EditTableDialog
            table={selectedTable}
            guests={guestsList}
            onClose={() => setSelectedTable(null)}
            onSave={handleSaveTable}
            onDelete={handleDeleteTable}
            isNew={
              selectedTable
                ? !tables.some((t) => t.number === selectedTable.number)
                : true
            }
            existingTables={tables}
          />

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
                setGuestsList(updatedGuests);

                if (guest.table !== newTableNumber) {
                  setSuccessMessage(
                    `✅ ${guest.name} עבר/ה משולחן ${guest.table || "לא משויך"} לשולחן ${newTableNumber}`
                  );
                  setTimeout(() => setSuccessMessage(""), 4000);
                }
              }}
            />
          )}
        </>
      )}

      <MessageDialog
        open={messageDialogOpen}
        message={messageText}
        onConfirm={() => setMessageDialogOpen(false)}
      />
    </div>
  );
};

export default TableManager;
