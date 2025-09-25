// models/SendSmsLog.ts
import mongoose, { Schema, Document, models, model } from "mongoose";

export type SmsType =
  | "saveDate"
  | "invitation"
  | "reminder"
  | "tableNumber"
  | "thankYou"
  | "cancel";

export interface ISendSmsLog extends Document {
  guestName?: string;
  guestPhone: string; // Optional, if you want to log phone numbers
  eventId: string;
  smsType: SmsType;
  sentAt: Date;
  status: "sent" | "failed";
  messageId?: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const sendSmsLogSchema = new Schema<ISendSmsLog>(
  {
    // guestId: { type: String, required: true },
    guestName: { type: String, required: false },
    guestPhone: { type: String, required: false },
    eventId: { type: String, required: true },
    smsType: {
      type: String,
      enum: [
        "saveDate",
        "invitation",
        "reminder",
        "tableNumber",
        "thankYou",
        "cancel",
      ],
      required: true,
    },
    sentAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
    },
    messageId: { type: String },
    ownerEmail: { type: String, required: true },
  },
  { timestamps: true }
);

// אינדקסים מומלצים
sendSmsLogSchema.index({ guestId: 1, smsType: 1 });
sendSmsLogSchema.index({ eventId: 1, smsType: 1 });
sendSmsLogSchema.index({ sentAt: 1 });

export const SendSmsLog =
  models.SendSmsLog || model<ISendSmsLog>("SendSmsLog", sendSmsLogSchema);
