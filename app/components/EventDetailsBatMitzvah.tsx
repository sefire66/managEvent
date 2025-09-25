"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRequired?: (field: string) => boolean;
  minDate?: string; // ← חדש
};

const EventDetailsBatMitzvah = ({
  details,
  onChange,
  isRequired,
  minDate,
}: Props) => {
  const mark = (field: string) => (isRequired?.(field) ? "" : "");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 justify-center text-right">
      <InputBox1
        name="brideFirst"
        titleName={`שם הכלה`}
        value={details.brideFirst}
        onChange={onChange}
        showError={isRequired?.("brideFirst") && !details.brideFirst}
      />
      <InputBox1
        name="brideLast"
        titleName={`שם המזמין`}
        value={details.brideLast}
        onChange={onChange}
        showError={isRequired?.("brideLast") && !details.brideLast}
        placeholder="לדוגמה: שני ויוסי יפרח"
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

export default EventDetailsBatMitzvah;
