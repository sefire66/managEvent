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
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import NewGuestModal from "./NewGuestModal";

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
  const [filters, setFilters] = useState<FilterState>({
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const storedGuests = localStorage.getItem("guestList");
    const storedSortField = localStorage.getItem("guestSortField");
    const storedSortOrder = localStorage.getItem("guestSortOrder");
    const storedSortActive = localStorage.getItem("guestSortActive");
    const storedFilters = localStorage.getItem("guestFilters");
    const storedShowFilter = localStorage.getItem("guestShowFilter");

    if (storedGuests) {
      const parsed = JSON.parse(storedGuests);
      setGuestsList(parsed);

      if (storedSortActive === "true" && storedSortField) {
        const order = storedSortOrder === "desc" ? "desc" : "asc";
        const sorted = sortGuestList(
          parsed,
          storedSortField as keyof Guest,
          order
        );
        setDisplayList(sorted);
        setSortField(storedSortField as keyof Guest);
        setSortOrder(order);
        setSortActive(true);
      } else {
        setDisplayList(parsed);
      }
    }

    if (storedFilters) {
      setFilters(JSON.parse(storedFilters));
    }

    if (storedShowFilter) {
      setShowFilter(JSON.parse(storedShowFilter));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("guestList", JSON.stringify(guestsList));
  }, [guestsList]);

  useEffect(() => {
    localStorage.setItem("guestSortField", sortField ?? "");
    localStorage.setItem("guestSortOrder", sortOrder);
    localStorage.setItem("guestSortActive", JSON.stringify(sortActive));
  }, [sortField, sortOrder, sortActive]);

  useEffect(() => {
    localStorage.setItem("guestFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem("guestShowFilter", JSON.stringify(showFilter));
  }, [showFilter]);

  const updateGuests = (newGuests: Guest[]) => {
    setGuestsList(newGuests);
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

    const newGuests = await importGuestListFromExcel(file);
    updateGuests(newGuests);
    e.target.value = "";
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
        guest.status.includes(filters.status) &&
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

      <GuestStats guestList={guestsList} />
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

      <div className="min-h-[400px] transition-all flex justify-center flex-col">
        <GuestsList
          guestsList={filteredList}
          updateGuest={updateGuest}
          deleteGuest={deleteGuest}
        />
      </div>

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
    </div>
  );
};

export default GuestListManager;
