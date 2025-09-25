import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ScheduledSms } from "@/models/ScheduledSms";
import Event from "@/models/Event";
import Guest from "@/models/Guest";
import { sendSmsByType } from "@/lib/sendSmsByType";

export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();

    const scheduledList = await ScheduledSms.find({
      auto: true,
      status: "pending",
      sendAt: { $lte: now },
    });

    for (const sms of scheduledList) {
      const { eventId } = sms;

      const eventDetails = await Event.findById(eventId);
      if (!eventDetails) {
        console.warn(`⚠️ Event not found for ID ${eventId}`);
        continue;
      }

      const guests = await Guest.find({ eventId });

      let filteredGuests = guests;

      switch (sms.smsType) {
        case "reminder":
          filteredGuests = guests.filter((g) => g.status === "לא ענה");
          break;
        case "invitation":
        case "tableNumber":
        case "thankYou":
          filteredGuests = guests.filter((g) => g.status === "בא");
          break;
        // saveDate – שליחה לכולם
      }

      console.log(`📨 ${sms.smsType} → ${filteredGuests.length} guests`);

      // 📨 שליחה אחד-אחד
      for (const guest of filteredGuests) {
        console.log(`➡️ Sending ${sms.smsType} to ${guest.name}`);
        const success = await sendSmsByType(
          [guest],
          eventDetails,
          sms.smsType,
          sms.ownerEmail
        );

        if (success) {
          console.log(`✅ Sent to ${guest.name}`);
        } else {
          console.error(`❌ Failed to send to ${guest.name}`);
        }
      }

      // ✅ עדכון סטטוס אחרי סיום שליחה
      await ScheduledSms.updateOne(
        { _id: sms._id },
        { $set: { status: "sent" } }
      );

      console.log(
        `✔️ Scheduled SMS "${sms.smsType}" marked as sent | Event: ${eventDetails.name}`
      );
    }

    return NextResponse.json({ message: "Auto SMS run completed" });
  } catch (error) {
    console.error("❌ Scheduled SMS run error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
