"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { Guest, Table, EventDetails } from "../types/types";
import GuestListFilter from "./GuestListFilter";
import { sortGuestList } from "../utilityFunctions/sortGuestList";
import GuestListToolbar from "./GuestListToolbar";
import {
  prepareGuestPreview,
  filterValidGuests,
  GuestRow,
} from "../utilityFunctions/guestImportUtils";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import { exportGuestListToExcel } from "../utilityFunctions/exportGuestListToExcel";
import { importGuestListFromExcel } from "../utilityFunctions/importGuestListFromExcel";
import GuestsList from "./GuestsList";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import NewGuestModal from "./NewGuestModal";
import EditGuestDialog from "./EditGuestDialog";
import MessageDialog from "./MessageDialog";
import { Button } from "./ui/button";
import { exportGuestPreviewToExcel } from "../utilityFunctions/exportGuestPreviewToExcel";
import MoveGuestDialog from "./MoveGuestDialog";
import GuestListDashboard from "./GuestListDashboard";
import SendSmsDialog from "./SendSmsDialog";

type FilterState = {
  name: string;
  phone: string;
  status: string;
  count: string;
  table: string;
};

interface GuestManagerProps {
  guestsList: Guest[];
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  eventDetails: EventDetails;
  onSmsSent: () => void;
  smsRefreshKey: number;
  loadingGuests?: boolean;
}

const GuestManager = ({
  guestsList,
  setGuestsList,
  tables,
  eventDetails,
  setTables,
  onSmsSent,
  smsRefreshKey,
  loadingGuests = false,
}: GuestManagerProps) => {
  const [displayList, setDisplayList] = useState<Guest[]>(guestsList);

  // ===== פתיחה עם ספינר (אקורדיון) =====
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [mountList, setMountList] = useState(false);

  const openWithSpinner = () => {
    setIsOpening(true);
    setIsOpen(true);
    requestAnimationFrame(() => {
      setMountList(true); // מרכיב את הרשימה בפריים הבא
      requestAnimationFrame(() => {
        setIsOpening(false); // מכבה ספינר אחרי הציור הבא (post-paint)
      });
    });
  };
  const closeSection = () => {
    setMountList(false);
    setIsOpen(false);
  };
  const toggle = () => (isOpen ? closeSection() : openWithSpinner());

  // ===== שליחת SMS לאורח =====
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsGuest, setSmsGuest] = useState<Guest | null>(null);
  const handleSendSms = (guest: Guest) => {
    setSmsGuest(guest);
    setSmsOpen(true);
  };

  useEffect(() => {
    setDisplayList(guestsList);
  }, [guestsList]);

  // ===== סינון/מיון =====
  const [filters, setFilters] = useState<FilterState>({
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  });

  const [sortField, setSortField] = useState<keyof Guest | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortActive, setSortActive] = useState(false);

  const handleSort = (field: keyof Guest) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortField === field && sortOrder === "asc") newOrder = "desc";
    const sorted = sortGuestList(guestsList, field, newOrder);
    setDisplayList(sorted);
    setSortField(field);
    setSortOrder(newOrder);
    setSortActive(true);
  };

  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ===== הודעות/דיאלוגים =====
  const [error, setError] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<GuestRow[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [movingGuest, setMovingGuest] = useState<Guest | null>(null);
  const [showMoveGuestModal, setShowMoveGuestModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { data: session } = useSession();

  // ===== ניווט חזרה לאותו אורח/שכן =====
  const listRef = useRef<HTMLDivElement>(null); // מיכל הגלילה של הרשימה
  const lastEditedIdRef = useRef<string | null>(null);
  const lastAnchorRef = useRef<{ id: string; index: number } | null>(null);
  const filteredListRef = useRef<Guest[]>([]);
  const selectedGuestRef = useRef<Guest | null>(null);

  // שומר מראה עדכני של הרשימה המסוננת בתוך ref (לשימוש בתוך rAF)
  const filteredList = useMemo(() => {
    const toInt = (v: unknown): number | null => {
      const s = String(v ?? "").trim();
      if (s === "") return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const safeDisplay = Array.isArray(displayList) ? displayList : [];
    const wantCount = toInt(filters.count);
    const wantTable = toInt(filters.table);

    return safeDisplay.filter((guest) => {
      if (
        !String(guest.name ?? "")
          .toLowerCase()
          .includes(filters.name.toLowerCase())
      )
        return false;
      if (!String(guest.phone ?? "").includes(filters.phone)) return false;
      if (filters.status !== "" && guest.status !== filters.status)
        return false;

      if (filters.count !== "") {
        const haveCount = toInt(guest.count);
        if (haveCount === null || wantCount === null || haveCount !== wantCount)
          return false;
      }

      if (filters.table !== "") {
        const rawTable = String(guest.table ?? "").trim();
        if (rawTable === "") return false;
        const haveTable = toInt(rawTable);
        if (haveTable === null || wantTable === null || haveTable !== wantTable)
          return false;
      }
      return true;
    });
  }, [displayList, filters]);

  useEffect(() => {
    filteredListRef.current = filteredList;
  }, [filteredList]);

  // עוזר: האם האלמנט בתחום ה־viewport של המיכל
  const isInView = (el: HTMLElement, container?: HTMLElement | null) => {
    const c = container ?? document.documentElement;
    const rb = el.getBoundingClientRect();
    const cb = (
      container
        ? container.getBoundingClientRect()
        : document.documentElement.getBoundingClientRect()
    ) as DOMRect;
    return rb.top >= cb.top && rb.bottom <= cb.bottom;
  };

  // הדגשה קלה לשנייה
  const flash = (el?: HTMLElement | null) => {
    if (!el) return;
    el.classList.add("ring-2", "ring-amber-400", "rounded-md");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-amber-400", "rounded-md");
    }, 1000);
  };

  // גלילה חזרה לאורח שנערך (אם עדיין קיים במסנן)
  const scrollBackToEdited = () => {
    requestAnimationFrame(() => {
      const id = lastEditedIdRef.current;
      if (!id) return;
      const el = document.getElementById(`guest-${id}`) as HTMLElement | null;
      if (el) {
        if (!isInView(el, listRef.current)) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        flash(el);
      } else {
        // נעלם מהמסנן → גלול לשכן הקרוב
        const anchor = lastAnchorRef.current;
        const list = filteredListRef.current;
        if (!anchor || list.length === 0) return;

        const safeIdx = Math.max(0, Math.min(anchor.index, list.length - 1));
        const neighbor = list[safeIdx];
        if (neighbor) {
          const nEl = document.getElementById(
            `guest-${neighbor._id}`
          ) as HTMLElement | null;
          if (nEl) {
            nEl.scrollIntoView({ block: "center", behavior: "smooth" });
            flash(nEl);
          }
          // הודעה ידידותית (יש לך כבר MessageDialog)
          setMessageText("האורח עודכן ונעלם מהתצוגה עקב הסינון הפעיל.");
          setMessageDialogOpen(true);
        }
      }
    });
  };

  // ===== Handlers =====
  const handleAddGuestClick = () => {
    if (!eventDetails?._id) {
      setMessageText("לא ניתן להוסיף אורח – יש לבחור אירוע תחילה.");
      setMessageDialogOpen(true);
      return;
    }
    setShowModal(true);
  };

  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    name: "",
    phone: "",
    status: "לא ענה",
    count: undefined,
    table: "",
  });

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const OpenEditGuest = (guest: Guest | null) => {
    // עוגן לפני עריכה: מזהה + אינדקס ברשימה המסוננת הנוכחית
    if (guest) {
      const idx = filteredListRef.current.findIndex((g) => g._id === guest._id);
      lastAnchorRef.current = { id: guest._id, index: idx };
      lastEditedIdRef.current = guest._id;
    }
    selectedGuestRef.current = guest;
    setSelectedGuest(guest);
  };

  const { data: sessionData } = useSession(); // לשימוש מקומי אם צריך

  const updateGuests = async (newGuests: Guest[]) => {
    const guestsWithEventId = newGuests.map((guest) => ({
      ...guest,
      eventId: eventDetails._id,
    }));

    setGuestsList(guestsWithEventId);

    if (session?.user?.email) {
      await fetch("/api/guests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: guestsWithEventId,
          ownerEmail: session.user.email,
          eventId: eventDetails._id,
        }),
      });
    }

    if (sortActive && sortField) {
      const sorted = sortGuestList(guestsWithEventId, sortField, sortOrder);
      setDisplayList(sorted);
    } else {
      setDisplayList(guestsWithEventId);
    }
  };

  const isValidPhone = (phone: string): boolean => /^05\d{8}$/.test(phone);

  const addGuestFromModal = () => {
    if (!eventDetails?._id) {
      setMessageText("לא ניתן להוסיף אורח – יש לבחור אירוע תחילה.");
      setMessageDialogOpen(true);
      return;
    }
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
    lastEditedIdRef.current = id; // נשמור את מי עודכן

    const updatedGuests = guestsList.map((guest) =>
      guest._id === id ? { ...guest, ...updatedGuest } : guest
    );
    updateGuests(updatedGuests);
    setGuestsList(updatedGuests);

    if (sortActive) {
      const updatedDisplay = displayList.map((guest) =>
        guest._id === id ? { ...guest, ...updatedGuest } : guest
      );
      setDisplayList(updatedDisplay);
    } else {
      setDisplayList(updatedGuests);
    }

    // אחרי הרינדור הבא נחזור לערך המתאים (אותו אורח או שכן)
    scrollBackToEdited();
  };

  const deleteGuest = (id: string) => {
    const updatedGuests = guestsList.filter((guest) => guest._id !== id);
    updateGuests(updatedGuests);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!eventDetails?._id) {
      setMessageText("לא ניתן לייבא אורחים – יש לבחור אירוע תחילה.");
      setMessageDialogOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const { guests, tables: importedTables } =
      await importGuestListFromExcel(file);

    const guestsWithEventId = guests.map((guest) => ({
      ...guest,
      eventId: eventDetails._id,
    }));

    const tablesWithEventId = importedTables.map((table) => ({
      number: table.number,
      totalSeats: table.totalSeats,
      note: "",
      eventId: eventDetails._id,
    }));

    const hasErrors = guestsWithEventId.some(
      (row) => (row as any).isInvalid || (row as any).isDuplicate
    );

    if (hasErrors) {
      setPreviewRows(guestsWithEventId as any);
      setShowPreviewDialog(true);
    } else {
      await updateGuests(guestsWithEventId as any);

      try {
        const response = await fetch("/api/tables/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session?.user?.email,
            eventId: eventDetails._id,
            tables: tablesWithEventId,
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

      setMessageText(
        `${guestsWithEventId.length} אורחים ו-${tablesWithEventId.length} שולחנות נוספו בהצלחה.`
      );
      setMessageDialogOpen(true);
    }

    e.target.value = "";
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => {
    if (!eventDetails?._id) {
      setMessageText("לא ניתן לייבא אורחים – יש לבחור אירוע תחילה.");
      setMessageDialogOpen(true);
      return;
    }
    inputRef.current?.click();
  };

  const totalCount = displayList.length;
  const filteredCount = filteredList.length;
  const isFiltering =
    filters.name !== "" ||
    filters.phone !== "" ||
    filters.status !== "" ||
    filters.count !== "" ||
    filters.table !== "";
  const percent = totalCount
    ? Math.round((filteredCount / totalCount) * 100)
    : 0;

  // ========== UI ==========
  return (
    <div className="bg-white p-0 rounded-2xl max-w-5xl mx-auto w-full my-1 mb-2 transition-all hover:scale-103 duration-300">
      {/* HEADER */}
      <button
        onClick={toggle}
        style={{ cursor: "pointer" }}
        className={`w-full border border-gray-300 rounded-md shadow p-2 mb-0 text-blue-600 text-base text-right transition-all duration-300 ${
          isOpen ? "border-b-4 border-blue-500" : ""
        } grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start`}
        dir="rtl"
      >
        {/* טור 1 – כותרת */}
        <div className="flex flex-col">
          <div className="flex flex-row items-center gap-2">
            <div
              className={`text-base transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div className="min-w-[150px] font-bold">ניהול אורחים</div>
          </div>
          {loadingGuests && (
            <span className="inline-flex items-center gap-2 text-gray-500 text-xs">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
              טוען…
            </span>
          )}
        </div>

        {/* טור 2 – תקציר */}
        <div className="w-full">
          <GuestListDashboard guestList={guestsList} />
        </div>

        {/* טור 3 – רווח */}
        <div className="hidden md:block" />
      </button>

      {/* גוף הרשימה */}
      {isOpen && (
        <>
          <div>
            <GuestListToolbar
              onAddGuest={handleAddGuestClick}
              onImportGuests={handleFileUpload}
              onExportGuests={() =>
                exportGuestListToExcel(sortActive ? displayList : guestsList)
              }
              onToggleFilter={() => setShowFilter((prev) => !prev)}
              showFilter={showFilter}
              onImportClick={handleImportClick}
              inputRef={inputRef}
            />
          </div>

          {showFilter && (
            <GuestListFilter
              filters={filters}
              setFilters={setFilters}
              sortField={sortField ?? "name"}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          )}

          {/* מונה תוצאות */}
          <div className="flex items-center justify-start px-2 py-1">
            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700">
              {isFiltering ? (
                <>
                  <span>תוצאות מסוננות:</span>
                  <strong>{filteredCount}</strong>
                  <span className="text-gray-400">/ {totalCount}</span>
                  <span className="text-gray-400">({percent}%)</span>
                </>
              ) : (
                <>
                  <span>סה״כ שורות:</span>
                  <strong>{totalCount}</strong>
                </>
              )}
            </div>
          </div>

          {/* מיכל גלילה יציב + ספינר פתיחה */}
          <div
            ref={listRef}
            className="relative min-h-[200px] max-h-[70vh] overflow-y-auto transition-all flex flex-col justify-start border w-full"
            style={{ direction: "rtl" }}
          >
            {loadingGuests ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent mb-3" />
                <div className="text-sm text-gray-600">טוען אורחים מהמסד…</div>
              </div>
            ) : (
              <>
                {isOpening && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
                  </div>
                )}

                <div
                  className={isOpening ? "opacity-50 pointer-events-none" : ""}
                >
                  {mountList && (
                    <GuestsList
                      guestsList={filteredList}
                      updateGuest={updateGuest}
                      deleteGuest={deleteGuest}
                      openEditGuest={OpenEditGuest}
                      tables={tables}
                      onSendSms={handleSendSms}
                      ownerEmail={session?.user?.email ?? ""}
                      eventId={String(eventDetails?._id ?? "")}
                      refreshKey={smsRefreshKey}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* New Guest Dialog */}
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="max-w-lg text-center bg-gray-200">
              <DialogHeader>
                <DialogTitle className="text-center">
                  הוספת אורח חדש
                </DialogTitle>
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
              <DialogFooter className="justify-between pt-4"></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Guest Dialog */}
          <EditGuestDialog
            guest={selectedGuest}
            onClose={() => setSelectedGuest(null)}
            onSave={(updated) => updateGuest(updated._id, updated)}
            onDelete={deleteGuest}
            tables={tables}
            guests={guestsList}
          />

          {/* Message Dialog */}
          <MessageDialog
            open={messageDialogOpen}
            message={messageText}
            onConfirm={() => setMessageDialogOpen(false)}
          />

          {/* Excel Preview Dialog */}
          {showPreviewDialog && (
            <Dialog
              open={showPreviewDialog}
              onOpenChange={setShowPreviewDialog}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>תצוגה מקדימה של קובץ האורחים</DialogTitle>
                </DialogHeader>
                <p className="text-[16px] text-gray-600 mb-1">
                  נא לבדוק את השורות הבאות לפני העלאה. שורות לא תקינות או כפולות
                  לא יעלו.
                </p>

                <div
                  className="flex flex-col items-end text-xs text-gray-700 mb-1"
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

                <div className="max-h-[300px] overflow-y-auto text-xs border border-gray-300 rounded-md">
                  <table className="w-full text-right border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-white shadow z-10">
                      <tr className="bg-gray-100 text-sm">
                        <th className="p-2 border-b">שם</th>
                        <th className="p-0.5 border-b text-center">טלפון</th>
                        <th className="p-0.5 border-b text-center">סטטוס</th>
                        <th className="p-0.5 border-b text-center">משתתפים</th>
                        <th className="p-0.5 border-b text-center">שולחן</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((guest, i) => (
                        <tr
                          key={i}
                          className={`text-[14px] ${
                            (guest as any).isInvalid
                              ? "bg-yellow-300"
                              : (guest as any).isDuplicate
                                ? "bg-red-100"
                                : ""
                          }`}
                        >
                          <td className="p-0.5 px-2 h-4">{guest.name}</td>
                          <td className="p-0.5 h-4 text-center">
                            {guest.phone}
                          </td>
                          <td className="p-0.5 h-4 text-center">
                            {guest.status}
                          </td>
                          <td className="p-0.5 h-4 text-center">
                            {guest.count}
                          </td>
                          <td className="p-0.5 h-4 text-center">
                            {guest.table}
                          </td>
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
                      const valid = filterValidGuests(previewRows as any);
                      updateGuests(valid as any);
                      setShowPreviewDialog(false);
                      setPreviewRows([]);
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

          {/* MoveGuestDialog */}
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
                updateGuests(updatedGuests);

                if (guest.table !== newTableNumber) {
                  setSuccessMessage(
                    `✅ ${guest.name} עבר משולחן ${guest.table || "לא משויך"} לשולחן ${newTableNumber}`
                  );
                  setTimeout(() => setSuccessMessage(""), 4000);
                }
              }}
            />
          )}

          {/* שליחת SMS לאורח יחיד */}
          {smsOpen && smsGuest && (
            <SendSmsDialog
              guest={smsGuest}
              event={eventDetails}
              onClose={() => setSmsOpen(false)}
              onSmsSent={() => {
                onSmsSent();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default GuestManager;
