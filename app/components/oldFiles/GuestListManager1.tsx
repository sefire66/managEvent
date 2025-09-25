"use client";

import React, { useEffect, useState, useMemo } from "react";
import GuestsList from "../GuestsList";
import type { Guest } from "../../types/types";
import { v4 as uuidv4 } from "uuid";
import ExcelJS from "exceljs";
import { sortGuestList } from "../../utilityFunctions/sortGuestList";
import { exportGuestListToExcel } from "../../utilityFunctions/exportGuestListToExcel";
import { importGuestListFromExcel } from "../../utilityFunctions/importGuestListFromExcel";
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
  const [displayList, setDisplayList] = useState<Guest[]>([]);
  const [sortField, setSortField] = useState<keyof Guest | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortActive, setSortActive] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    name: "",
    phone: "",
    status: "",
    count: "",
    table: "",
  });

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
    updateGuests([newGuest, ...guestsList]);
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
    <div className="space-y-4 p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold text-blue-700 text-center">
        ניהול מוזמנים
      </h2>

      <GuestStats guestList={guestsList} />

      <GuestListToolbar
        onAddGuest={addGuest}
        onImportGuests={handleFileUpload}
        onExportGuests={() =>
          exportGuestListToExcel(sortActive ? displayList : guestsList)
        }
        onToggleFilter={() => setShowFilter((prev) => !prev)}
        showFilter={showFilter}
      />

      {showFilter && (
        <GuestListFilter
          filters={filters}
          setFilters={setFilters}
          sortField={sortField ?? "name"}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}

      <div className="min-h-[400px] transition-all ">
        <GuestsList
          guestsList={filteredList}
          updateGuest={updateGuest}
          deleteGuest={deleteGuest}
        />
      </div>
    </div>
  );
};

export default GuestListManager;
