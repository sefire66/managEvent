import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/models/Event";

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();

    const { eventId, email } = await req.json();

    if (!eventId || !email) {
      return NextResponse.json(
        { error: "Missing eventId or email" },
        { status: 400 }
      );
    }

    const result = await Event.deleteMany({ _id: eventId, ownerEmail: email });

    console.log(
      `🗑️ Deleted ${result.deletedCount} event for eventId=${eventId} email=${email}`
    );
    return NextResponse.json(
      {
        message: "event deleted successfully",
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in DELETE /api/events/deleteByEvent:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// This function deletes all events associated with a specific eventId and client email.
// It connects to the database, checks for the required parameters, and performs the deletion.
// If successful, it returns the count of deleted events; otherwise, it returns an error message.
// This is useful for cleaning up events when an event is deleted or modified.
// Make sure to handle this API route in your client-side code to call it when needed.
