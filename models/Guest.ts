import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    _id: { type: String }, // ✅ allow custom _id (from client)

    ownerEmail: { type: String, required: true },
    eventId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    status: {
      type: String,
      enum: ["לא ענה", "בא", "לא בא", "אולי"],
      default: "לא ענה",
    },
    table: { type: String, default: "" },
    count: { type: Number },
    smsCount: { type: Number, default: 0 },
    lastSms: { type: String, default: "" },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Prevent model overwrite in dev mode (Next.js hot reload)
export default mongoose.models.Guest || mongoose.model("Guest", GuestSchema);
