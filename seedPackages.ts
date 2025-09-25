import mongoose from "mongoose";
import { connectToDatabase } from "./lib/mongodb";
import Package from "./models/Package";

const packages = [
  { name: "free", price: 0, smsAmount: 10 },
  { name: "basic", price: 50, smsAmount: 50 },
  { name: "premium", price: 150, smsAmount: 200 },
  { name: "enterprise", price: 500, smsAmount: 1000 },
];

(async () => {
  await connectToDatabase();
  await Package.deleteMany({});
  await Package.insertMany(packages as any); // ✅ מונע בעיית טיפוס
  console.log("✅ Packages seeded successfully!");
  mongoose.disconnect();
})();
