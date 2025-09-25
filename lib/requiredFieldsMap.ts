// app/lib/requiredFieldsMap.ts
import type { EventDetails } from "@/app/types/types";

export const requiredFieldsMap: Record<string, (keyof EventDetails)[]> = {
  חתונה: [
    "brideFirst",
    "brideLast",
    "groomFirst",
    "groomLast",
    "date",
    "time",
    "venue",
    "address",
  ],
  "בר מצווה": ["groomFirst", "groomLast", "date", "time", "venue", "address"],
  "בת מצווה": ["brideFirst", "brideLast", "date", "time", "venue", "address"],
  "יום הולדת": ["brideFirst", "brideLast", "date", "venue", "time", "address"],

  חינה: [
    "brideFirst",
    "brideLast",
    "groomFirst",
    "groomLast",
    "date",
    "time",
    "venue",
    "address",
  ],
  ברית: ["brideFirst", "date", "time", "venue", "address"],
  בריתה: ["brideFirst", "date", "venue", "time", "address"],

  "אירוע עסקי": ["brideFirst", "date", "venue", "time", "address"],
};
