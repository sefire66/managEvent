import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Guest } from "../../types/types";

interface Props {
  newGuest: Guest;
  setNewGuest: (guest: Guest) => void;
  errors: {
    name?: string;
    phone?: string;
  };
  setErrors: (errs: { name?: string; phone?: string }) => void;
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
  errors,
  setErrors,
  guestsList,
  isFormValid,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="p-4 border rounded-lg shadow bg-gray-50 space-y-4">
      {/* שם */}
      <div>
        <Input
          placeholder="שם"
          className={`w-full ${errors.name ? "border-red-500" : ""}`}
          value={newGuest.name || ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewGuest({ ...newGuest, name: value });
            if (errors.name && value.trim()) {
              setErrors({ ...errors, name: undefined });
            }
          }}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* טלפון */}
      <div>
        <Input
          placeholder="טלפון"
          className={`w-full ${errors.phone ? "border-red-500" : ""}`}
          value={newGuest.phone || ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewGuest({ ...newGuest, phone: value });

            const isDuplicate = guestsList.some((g) => g.phone === value);
            const isValid = isValidPhone(value);

            if (errors.phone && isValid && !isDuplicate) {
              setErrors({ ...errors, phone: undefined });
            }
          }}
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>

      {/* כמות */}
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

      {/* שולחן */}
      <div>
        <Input
          placeholder="שולחן"
          value={newGuest.table || ""}
          onChange={(e) => setNewGuest({ ...newGuest, table: e.target.value })}
        />
      </div>

      {/* כפתורים */}
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
