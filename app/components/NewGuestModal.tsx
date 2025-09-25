import React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Guest } from "../types/types";
import { validatePhoneNumber } from "../utilityFunctions/validatePhoneNumber";

interface Props {
  newGuest: Guest;
  setNewGuest: (guest: Guest) => void;
  errors: {
    name?: string;
    phone?: string;
  };
  setErrors: (errs: { name?: string; phone?: string }) => void;
  guestsList: Guest[];
  displayList: Guest[];
  onCancel: () => void;
  onConfirm: () => void;
}

function isPhoneNumberDuplicate(
  phone: string,
  guestsList: Guest[],
  displayList: Guest[]
): boolean {
  return (
    guestsList.some((g) => g.phone === phone) ||
    displayList.some((g) => g.phone === phone)
  );
}

export default function NewGuestModal({
  newGuest,
  setNewGuest,
  errors,
  setErrors,
  guestsList,
  displayList,
  onCancel,
  onConfirm,
}: Props) {
  const handlePhoneChange = (value: string) => {
    setNewGuest({ ...newGuest, phone: value });

    if (!value.trim()) {
      setErrors({ ...errors, phone: "נא למלא מספר טלפון" });
      return;
    }

    if (!/^05\d{8}$/.test(value)) {
      setErrors({
        ...errors,
        phone: "מספר הטלפון חייב להתחיל ב-05 ולהכיל 10 ספרות",
      });
      return;
    }

    if (isPhoneNumberDuplicate(value, guestsList, displayList)) {
      setErrors({ ...errors, phone: "מספר הטלפון כבר קיים ברשימה" });
      return;
    }

    setErrors({ ...errors, phone: undefined });
  };

  const isFormValid =
    !!newGuest.name?.trim() && !!newGuest.phone?.trim() && !errors.phone;

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
          onChange={(e) => handlePhoneChange(e.target.value)}
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
