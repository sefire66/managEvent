import mongoose, { Schema, Document, models, model } from "mongoose";

export type SmsType =
  | "saveDate"
  | "invitation"
  | "reminder"
  | "tableNumber"
  | "thankYou";

export interface IScheduledSms extends Document {
  eventId: mongoose.Types.ObjectId;
  smsType: SmsType;
  sendAt: Date;
  status: "pending" | "sent" | "failed";
  auto: boolean;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledSmsSchema = new Schema<IScheduledSms>(
  {
    eventId: { type: Schema.Types.ObjectId, required: true, ref: "Event" },
    smsType: {
      type: String,
      enum: ["saveDate", "invitation", "reminder", "tableNumber", "thankYou"],
      required: true,
    },
    sendAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    auto: { type: Boolean, default: true },
    ownerEmail: { type: String, required: true },
  },
  { timestamps: true }
);

export const ScheduledSms =
  models.ScheduledSms ||
  model<IScheduledSms>("ScheduledSms", scheduledSmsSchema);
