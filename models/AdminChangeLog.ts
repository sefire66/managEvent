// models/AdminChangeLog.ts
import mongoose, { Schema } from "mongoose";

const AdminChangeLogSchema = new Schema(
  {
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: String,
    actorRole: String,
    changes: [
      {
        field: String,
        from: Schema.Types.Mixed,
        to: Schema.Types.Mixed,
      },
    ],
    reason: String, // אופציונלי: סיבת שינוי
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.AdminChangeLog ||
  mongoose.model("AdminChangeLog", AdminChangeLogSchema);
