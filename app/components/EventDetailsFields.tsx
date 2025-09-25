"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";
import EventDetailsWedding from "./EventDetailsWedding";
import EventDetailsBarMitzvah from "./EventDetailsBarMitzvah";
import EventDetailsBatMitzvah from "./EventDetailsBatMitzvah";
import EventDetailsBirthday from "./EventDetailsBirthday";
import EventDetailsBusiness from "./EventDetailsBusiness";
import EventDetailsBrit from "./EventDetailsBrit"; // ← חדש

type Props = {
  details: EventDetails;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  isRequired?: (field: string) => boolean;
  minDate?: string;
  dateError?: string;
  onDateBlur?: React.FocusEventHandler<HTMLInputElement>;
  maxDate?: string;
};

// הוספנו: חינה, ברית, בריתה
const eventTypes = [
  "חתונה",
  "חינה",
  "בר מצווה",
  "בת מצווה",
  "ברית",
  "בריתה",
  "יום הולדת",
  "אירוע עסקי",
];

export default function EventDetailsFields({
  details,
  onChange,
  isRequired,
  minDate,
  dateError,
  onDateBlur,
  maxDate,
}: Props) {
  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div className="flex flex-col items-center">
        <select
          name="eventType"
          value={details.eventType ?? ""}
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

      <div>
        {/* חתונה + חינה (אותם שדות) */}
        {(details.eventType === "חתונה" || details.eventType === "חינה") && (
          <EventDetailsWedding
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
            onDateBlur={onDateBlur}
            maxDate={maxDate}
          />
        )}

        {details.eventType === "בר מצווה" && (
          <EventDetailsBarMitzvah
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
          />
        )}

        {details.eventType === "בת מצווה" && (
          <EventDetailsBatMitzvah
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
          />
        )}

        {/* ברית / בריתה */}
        {(details.eventType === "ברית" || details.eventType === "בריתה") && (
          <EventDetailsBrit
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
          />
        )}

        {details.eventType === "יום הולדת" && (
          <EventDetailsBirthday
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
          />
        )}

        {details.eventType === "אירוע עסקי" && (
          <EventDetailsBusiness
            details={details}
            onChange={onChange}
            isRequired={isRequired}
            minDate={minDate}
          />
        )}
      </div>
    </div>
  );
}
