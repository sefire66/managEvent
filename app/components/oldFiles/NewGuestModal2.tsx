import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Guest } from "../../types/types";

import React, { useEffect } from "react";

interface Props {
  newGuest: Guest;
  setNewGuest: (guest: Guest) => void;
  error: string;
  setError: (msg: string) => void;
  guestsList: Guest[];
  isFormValid: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function isValidPhone(phone: string): boolean {
  return /^05\d{8}$/.test(phone);
}

export default function NewGuestModal({
  newGuest,
  setNewGuest,
  error,
  setError,
  guestsList,
  isFormValid,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    console.log("Current error:", error);
  }, [error]);

  return (
    <div className="p-4 border rounded-lg shadow bg-gray-50 space-y-4">
      <div>
        <Input
          placeholder="שם"
          className={`w-full ${error.includes("שם") ? "border-red-500" : ""}`}
          value={newGuest.name || ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewGuest({ ...newGuest, name: value });
            if (error.includes("שם") && value.trim()) setError("");
          }}
        />
        {error.includes("שם") && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>

      <div>
        <Input
          placeholder="טלפון"
          className={`w-full ${
            error.includes("טלפון") ||
            error.includes("מספר") ||
            error.includes("כבר קיים")
              ? "border-red-500"
              : ""
          }`}
          value={newGuest.phone || ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewGuest({ ...newGuest, phone: value });
            const isDuplicate = guestsList.some((g) => g.phone === value);
            if (
              (error.includes("טלפון") ||
                error.includes("מספר") ||
                error.includes("כבר קיים")) &&
              isValidPhone(value) &&
              !isDuplicate
            ) {
              setError("");
            }
          }}
        />

        {(error.includes("טלפון") ||
          error.includes("מספר") ||
          error.includes("כבר קיים")) && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>

      <div>
        <Input
          placeholder="כמות"
          value={newGuest.count?.toString() ?? ""}
          onChange={(e) =>
            setNewGuest({
              ...newGuest,
              count: parseInt(e.target.value) || undefined,
            })
          }
        />
      </div>

      <div>
        <Input
          placeholder="שולחן"
          value={newGuest.table || ""}
          onChange={(e) => setNewGuest({ ...newGuest, table: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          disabled={!isFormValid}
          onClick={onConfirm}
          className={!isFormValid ? "opacity-50 cursor-not-allowed" : ""}
        >
          הוסף
        </Button>
        <Button variant="outline" onClick={onCancel}>
          בטל
        </Button>
      </div>
    </div>
  );
}
