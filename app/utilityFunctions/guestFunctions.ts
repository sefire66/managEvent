// deletes all guests associated with a specific eventID
export async function deleteGuestsByEventClient(
  eventId: string | undefined,
  email: string
) {
  try {
    const response = await fetch("/api/guests/deleteByEvent", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Unknown error");
    }

    const data = await response.json();
    console.log("Guests deleted:", data.deletedCount);
    return data;
  } catch (error) {
    console.error("Failed to delete guests:", error);
    throw error;
  }
}

// end deletes a specific guest by its eventID
