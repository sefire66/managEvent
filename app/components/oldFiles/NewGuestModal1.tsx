import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Guest } from "../../types/types";

interface Props {
  newGuest: Partial<Guest>;
  setNewGuest: (guest: Partial<Guest>) => void;
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
  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          placeholder="שם"
          className={error.includes("שם") ? "border-red-500" : ""}
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

      <div className="relative mb-4">
        <Input
          placeholder="טלפון"
          className={`w-full ${
            error.includes("טלפון") ||
            error.includes("מספר") ||
            error.includes("כבר קיים")
              ? "border-red-500"
              : ""
          }`}
          value={newGuest.phone}
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
        {error && error.includes("טלפון") && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>

      {/* <div className="relative">
      we have here icons for phone and validation
        <Input
          placeholder="טלפון"
          className={`pr-8 w-full ${
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
        {newGuest.phone && (
          <span
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-sm pointer-events-none ${
              isValidPhone(newGuest.phone) &&
              !guestsList.some((g) => g.phone === newGuest.phone)
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {isValidPhone(newGuest.phone) &&
            !guestsList.some((g) => g.phone === newGuest.phone)
              ? "✔"
              : "✖"}
          </span>
        )}
        {(error.includes("טלפון") ||
          error.includes("מספר") ||
          error.includes("כבר קיים")) && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div> */}

      <Input
        placeholder="כמות"
        value={newGuest.count ?? ""}
        onChange={(e) =>
          setNewGuest({
            ...newGuest,
            count: parseInt(e.target.value) || undefined,
          })
        }
      />

      <Input
        placeholder="שולחן"
        value={newGuest.table || ""}
        onChange={(e) => setNewGuest({ ...newGuest, table: e.target.value })}
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          בטל
        </Button>
        <Button onClick={onConfirm} disabled={!isFormValid}>
          הוסף
        </Button>
      </div>
    </div>
  );
}
