"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRequired?: (field: string) => boolean;
  minDate?: string; // ← חדש
};

const EventDetailsBirthday = ({
  details,
  onChange,
  isRequired,
  minDate,
}: Props) => {
  const mark = (field: string) => (isRequired?.(field) ? "" : "");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-1 gap-y-1 max-w-md w-full px-2 text-right">
      <InputBox1
        name="brideFirst"
        titleName={`שם החוגג/ת`}
        value={details.brideFirst}
        onChange={onChange}
        placeholder="לדוגמה: שני סימון"
        showError={isRequired?.("brideFirst") && !details.brideFirst}
      />
      <InputBox1
        name="brideLast"
        titleName={`שם המזמין`}
        value={details.brideLast}
        onChange={onChange}
        placeholder="משפ יפרח / שני ויוסי יפרח"
        showError={isRequired?.("brideLast") && !details.brideLast}
      />

      <InputBox1
        name="date"
        titleName={`תאריך${mark("date")}`}
        type="date"
        value={details.date}
        onChange={onChange}
        showError={isRequired?.("date") && !details.date}
        min={minDate}
      />
      <InputBox1
        name="time"
        titleName={`שעה${mark("time")}`}
        type="time"
        value={details.time}
        onChange={onChange}
        showError={isRequired?.("time") && !details.time}
      />
      <InputBox1
        name="venue"
        titleName={`שם המקום${mark("venue")}`}
        value={details.venue}
        onChange={onChange}
        showError={isRequired?.("venue") && !details.venue}
      />
      <InputBox1
        name="address"
        titleName={`כתובת${mark("address")}`}
        value={details.address}
        onChange={onChange}
        showError={isRequired?.("address") && !details.address}
      />
    </div>
  );
};

export default EventDetailsBirthday;
