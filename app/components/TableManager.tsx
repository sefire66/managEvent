import React, { useState } from "react";
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
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>; // ✅ ADD THIS LINE
  eventDetails: EventDetails;
}

// console.log("🗑 showDeleteDialog:", showDeleteDialog);

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
  const toggleShortView = () => {
    setShortView((prev) => !prev);
  };

  // ======handleAddTable=========
  const handleAddTable = () => {
    if (!eventDetails?._id) {
      setMessageText("יש ללא ניתן להוסיף שולחן – יש לבחור אירוע תחילה.");
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

  // ====end handleAddTable========
  const saveTablesToDB = async (tables: Table[], email: string) => {
    if (!email) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, email, eventId: eventDetails._id }),
    });
  };

  const handleSaveTable = (updatedTable: Table) => {
    let updatedTables: Table[] = [];

    setTables((prev) => {
      const withoutCurrent = prev.filter(
        (t) => t.number !== updatedTable.number
      );

      const updated = [...withoutCurrent, updatedTable];

      const sorted = updated.sort(
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

  const handleDeleteTable = (tableNumber: string) => {
    const updated = tables.filter((t) => t.number !== tableNumber);
    setTables(updated);
    saveTablesToDB(updated, session?.user?.email || "");
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  return (
    <div className="bg-white p-.5 rounded-2xl max-w-4xl mx-auto w-full mb-16 mt-1 transition-all hover:scale-103 duration-300">
      <button
        onClick={() => {
          const willOpen = !isOpen;
          setIsOpen(willOpen);

          if (willOpen) {
            setTimeout(() => {
              window.scrollBy({ top: 300, behavior: "smooth" });
            }, 100);
          }
        }}
        style={{ cursor: "pointer" }}
        className={`w-full border border-gray-300 rounded-md shadow p-2 mb-2 text-blue-600  text-base text-right transition-all duration-300   ${
          isOpen ? "border-b-4 border-blue-500" : ""
        } grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start`}
        dir="rtl"
      >
        {/* עמודה 1 — אייקון + כותרת (180px) */}
        <div className="flex flex-row items-center gap-2">
          <div
            className={`text-base transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </div>
          <div className="min-w-[180px] font-bold">ניהול שולחנות</div>
        </div>

        {/* עמודה 2 — תקציר/דאשבורד (1fr) */}
        <div className="w-full">
          <TableDashboard tables={tables} guests={guestsList} />
        </div>

        {/* עמודה 3 — placeholder לשמירת רוחב (160px) */}
        <div className="hidden md:block" />
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
                    `✅ ${guest.name} עבר/ה משולחן ${
                      guest.table || "לא משויך"
                    } לשולחן ${newTableNumber}`
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
