// deletes all events associated with a specific eventID
export async function deleteEventsByEventClient(
  eventId: string | undefined,
  email: string
) {
  try {
    const response = await fetch("/api/events/deleteByEvent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Unknown error");
    }

    const data = await response.json();
    console.log("Events deleted:", data.deletedCount);
    return data;
  } catch (error) {
    console.error("Failed to delete events:", error);
    throw error;
  }
}

// end deletes a specific event by its eventID
