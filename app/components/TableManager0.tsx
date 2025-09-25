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
  // Finds the highest existing table number.
  //Creates a new table object with next number.
  // Sets it in selectedTable → which opens EditTableDialog.

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
  // =====saveTablesToD
  // Posts the current tables array to your /api/tables endpoint.
  // Associates saved tables with the logged-in user’s email.

  const saveTablesToDB = async (tables: Table[], email: string) => {
    if (!email) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, email, eventId: eventDetails._id }),
    });
  };
  // ==end saveTablesToD===============

  //======== handleSaveTable =======
  // Updates the tables array by adding/replacing the given table.
  // Sorts tables by number.
  // Saves updated tables to DB via saveTablesToDB.
  // Updates local state.
  const handleSaveTable = (updatedTable: Table) => {
    let updatedTables: Table[] = []; // משתנה חיצוני לשמירה זמנית

    setTables((prev) => {
      const withoutCurrent = prev.filter(
        (t) => t.number !== updatedTable.number
      );

      const updated = [...withoutCurrent, updatedTable];

      const sorted = updated.sort(
        (a, b) => parseInt(a.number) - parseInt(b.number)
      );

      updatedTables = sorted; // שומר את הערך לחוץ ל־setTables
      return sorted;
    });

    // ✅ קריאה יחידה לשמירה אחרי setTables
    const tablesWithEventId = updatedTables.map((table) => ({
      ...table,
      eventId: eventDetails._id,
    }));

    saveTablesToDB(tablesWithEventId, session?.user?.email || "");

    setSelectedTable(null); // Close EditTableDialog
  };

  // ===end handleSaveTable Handler======
  //
  // ============handleDeleteTable
  // Filters out the table with the given number.
  // Updates the tables state.
  // Saves the new list to your backend.
  const handleDeleteTable = (tableNumber: string) => {
    const updated = tables.filter((t) => t.number !== tableNumber);
    setTables(updated);
    saveTablesToDB(updated, session?.user?.email || "");
  };
  // ====end handleDeleteTable======
  // ========TableDashboard
  // Renders an overview of tables + guests assigned.
  // Provides a quick summary at the top of the table section.

  // =====end TableDashboard

  // console.log("🪑 selectedTable:", selectedTable);
  // console.log("🔎 shortView:", shortView);
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  return (
    <div className="bg-white p-.5 rounded-2xl max-w-4xl mx-auto w-full mb-16  ">
      <button
        onClick={() => {
          // if (!eventDetails?._id) {
          //   setMessageText(
          //     "לא ניתן להציג את ניהול השולחנות – יש לבחור אירוע תחילה."
          //   );
          //   setMessageDialogOpen(true);
          //   return; // עצור כאן – לא לפתוח את האקורדיון
          // }

          const willOpen = !isOpen;
          setIsOpen(willOpen);

          if (willOpen) {
            setTimeout(() => {
              window.scrollBy({ top: 300, behavior: "smooth" });
            }, 100);
          }
        }}
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
                setGuestsList(updatedGuests); // use the setter from wrapper props

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

          {/* {successMessage && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-4 text-sm text-right shadow">
              {successMessage}
            </div>
          )} */}
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
