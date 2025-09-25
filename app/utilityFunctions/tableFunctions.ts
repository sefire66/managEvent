import type { Guest } from "../types/types";
import type { Table } from "../types/types";

// החזרת רשימת אורחים לשולחן מסוים
export function getGuestsAtTable(guests: Guest[], number: string): Guest[] {
  console.log("🔍 tableNumber:", number);
  guests.forEach((g) =>
    console.log(
      "📋 guest.table:",
      g.table,
      "===",
      number,
      "=>",
      g.table === String(number)
    )
  );
  return guests.filter(
    (guest) => String(guest.table) === String(number) && guest.status === "בא"
  );
}

// מחשב כמה מושבים תפוסים לפי אורחים שמגיעים לשולחן מסוים
export function getOccupiedSeats(guests: Guest[], number: string): number {
  const guestsAtTable = guests.filter(
    (g) => g.table === number && g.status === "בא"
  );

  return guestsAtTable.reduce((sum, guest) => sum + (guest.count ?? 1), 0);
}

// מחשב כמה מושבים פנויים בשולחן לפי סך המקומות והתפוסים
export function getAvailableSeats(table: Table, guests: Guest[]): number {
  const occupied = getOccupiedSeats(guests, String(table.number));
  return table.totalSeats - occupied;
}

// deletes all tables associated with a specific eventID
export async function deleteTablesByEventClient(
  eventId: string | undefined,
  email: string
) {
  try {
    const response = await fetch("/api/tables/deleteByEvent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Unknown error");
    }

    const data = await response.json();
    console.log("Tables deleted:", data.deletedCount);
    return data;
  } catch (error) {
    console.error("Failed to delete tables:", error);
    throw error;
  }
}

// end deletes a specific table by its ID
