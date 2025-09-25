"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";
import EventDetailsWedding from "./EventDetailsWedding";
import EventDetailsBarMitzvah from "./EventDetailsBarMitzvah";
import EventDetailsBatMitzvah from "./EventDetailsBatMitzvah";
import EventDetailsBirthday from "./EventDetailsBirthday";
import EventDetailsBusiness from "./EventDetailsBusiness";

type Props = {
  details: EventDetails;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
};

const eventTypes = ["חתונה", "בר מצווה", "בת מצווה", "יום הולדת", "אירוע עסקי"];

export default function EventDetailsFields({ details, onChange }: Props) {
  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-4">
      <div className="flex flex-col items-center">
        <label className="text-sm font-medium text-blue-700 mb-1">
          סוג האירוע
        </label>
        <select
          name="eventType"
          value={details.eventType}
          onChange={onChange}
          className="w-auto border border-blue-300 rounded px-3 py-1 text-sm text-center bg-gray-50"
        >
          <option value="">בחר סוג אירוע</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* שדות לפי סוג האירוע */}
      {details.eventType === "חתונה" && (
        <EventDetailsWedding details={details} onChange={onChange} />
      )}

      {details.eventType === "בר מצווה" && (
        <EventDetailsBarMitzvah details={details} onChange={onChange} />
      )}

      {details.eventType === "בת מצווה" && (
        <EventDetailsBatMitzvah details={details} onChange={onChange} />
      )}

      {details.eventType === "יום הולדת" && (
        <EventDetailsBirthday details={details} onChange={onChange} />
      )}

      {details.eventType === "אירוע עסקי" && (
        <EventDetailsBusiness details={details} onChange={onChange} />
      )}
    </div>
  );
}
