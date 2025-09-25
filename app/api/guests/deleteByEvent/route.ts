import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";

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

    const result = await Guest.deleteMany({ eventId, ownerEmail: email });

    console.log(
      `🗑️ Deleted ${result.deletedCount} geusts for eventId=${eventId} email=${email}`
    );
    return NextResponse.json(
      {
        message: "Guest deleted successfully",
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in DELETE /api/guests/deleteByEvent:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// This function deletes all guests associated with a specific eventId and client email.
// It connects to the database, checks for the required parameters, and performs the deletion.
// If successful, it returns the count of deleted guests; otherwise, it returns an error message.
// This is useful for cleaning up guests when an event is deleted or modified.
// Make sure to handle this API route in your client-side code to call it when needed.
