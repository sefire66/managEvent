// models/Table.ts
import mongoose from "mongoose";

const TableSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  number: { type: String, required: true }, // ✅ שם עקבי
  totalSeats: { type: Number, required: true },
  note: { type: String },
  clientEmail: { type: String, required: true },
});

export default mongoose.models.Table || mongoose.model("Table", TableSchema);
