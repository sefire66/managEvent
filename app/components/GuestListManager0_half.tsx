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
import TableDashboard from "./TableDashboard";
import GuestListDashboard from "./GuestListDashboard";
import type { EventDetails } from "../types/types";

interface GuestListManagerProps {
  guestsList: Guest[];
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>;
  eventDetails: EventDetails;
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
  const [movingGuest, setMovingGuest] = useState<Guest | null>(null);
  const [showMoveGuestModal, setShowMoveGuestModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [shortView, setShortView] = useState(false);
  const toggleShortView = () => setShortView((prev) => !prev);
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const OpenEditGuest = (guest: Guest | null) => setSelectedGuest(guest);
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

  useEffect(() => {
    if (!session) {
      setGuestsList([]);
      setDisplayList([]);
    }
  }, [session]);

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
  }, [eventDetails, session]);

  const updateGuests = async (newGuests: Guest[]) => {
    setGuestsList(newGuests);
    if (session?.user?.email) {
      await fetch("/api/guests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: newGuests,
          ownerEmail: session.user.email,
          eventId: eventDetails?._id,
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

  const isValidPhone = (phone: string): boolean => /^05\d{8}$/.test(phone);

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
  };

  const deleteGuest = (id: string) =>
    updateGuests(guestsList.filter((guest) => guest._id !== id));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { guests, tables } = await importGuestListFromExcel(file);
    const hasErrors = guests.some((row) => row.isInvalid || row.isDuplicate);
    if (hasErrors) {
      setPreviewRows(guests);
      setShowPreviewDialog(true);
    } else {
      await updateGuests(guests);
      try {
        const response = await fetch("/api/tables/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session?.user?.email,
            eventId: eventDetails?._id,
            tables: tables,
          }),
        });
        const savedTables = await response.json();
        const sortedTables = savedTables.sort(
          (a: Table, b: Table) => parseInt(a.number) - parseInt(b.number)
        );
        setTables(sortedTables);
      } catch (err) {
        console.error("🚨 Error saving tables:", err);
      }
      setMessageText(
        `${guests.length} אורחים ו-${tables.length} שולחנות נוספו בהצלחה.`
      );
      setMessageDialogOpen(true);
    }
    e.target.value = "";
  };

  const handleSort = (field: keyof Guest) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortField === field && sortOrder === "asc") newOrder = "desc";
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

  const loadTables = async (email: string) => {
    const res = await fetch(
      `/api/tables?email=${email}&eventId=${eventDetails?._id}`
    );
    const data = await res.json();
    setTables(data);
  };

  useEffect(() => {
    if (session?.user?.email) {
      loadTables(session.user.email);
    }
  }, [session, eventDetails]);

  const saveTablesToDB = async (tables: Table[], email: string) => {
    if (!email) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, email, eventId: eventDetails?._id }),
    });
  };

  const handleSaveTable = (updatedTable: Table) => {
    setTables((prev) => {
      const withoutCurrent = prev.filter(
        (t) => t.number !== updatedTable.number
      );
      const updated = [...withoutCurrent, updatedTable];
      const sorted = updated.sort(
        (a, b) => parseInt(a.number) - parseInt(b.number)
      );
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

  return <div>/* Component rendering remains unchanged */</div>;
};

export default GuestListManager;
