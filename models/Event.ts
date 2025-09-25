import mongoose from "mongoose";

// === תת־סכימה להעדפות RSVP ===
const PreferencesSchema = new mongoose.Schema(
  {
    hideDetails: { type: Boolean, default: false },
    imageRatio: {
      type: String,
      enum: ["auto", "16:9", "4:3"],
      default: "auto",
    },
    // מטה־דאטה (אופציונלי, נח לשימוש ב־API):
    version: { type: Number, default: 1 },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    _id: false, // אין צורך ב-_id לתת־סכימה הזו
    id: false,
  }
);

const EventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true },
    ownerEmail: { type: String, required: true },

    brideFirst: { type: String },
    brideLast: { type: String },
    groomFirst: { type: String },
    groomLast: { type: String },

    date: { type: String, required: true },
    time: { type: String },
    venue: { type: String },
    address: { type: String },

    imageUrl: { type: String },
    imagePath: { type: String },

    googleMapsLink: { type: String },
    wazeLink: { type: String },

    customerId: { type: String },

    isCanceled: { type: Boolean, default: false, index: true },
    cancelReason: { type: String, trim: true, maxlength: 250 },

    // === כאן נכנס אובייקט ההעדפות המקונן ===
    preferences: {
      type: PreferencesSchema,
      default: () => ({
        hideDetails: false,
        imageRatio: "auto",
        version: 1,
        updatedAt: new Date(),
      }),
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// מניעת כפילויות כפי שהיה
EventSchema.index({ ownerEmail: 1, eventType: 1, date: 1 }, { unique: true });

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
