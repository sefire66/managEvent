"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRequired?: (field: string) => boolean;
  minDate?: string; // ← חדש
  onDateBlur?: React.FocusEventHandler<HTMLInputElement>;
  maxDate?: string; // ← חדש
};

const EventDetailsWedding = ({
  details,
  onChange,
  isRequired,
  minDate,
  onDateBlur,
  maxDate, // ← חדש
}: Props) => {
  const mark = (field: string) => (isRequired?.(field) ? "" : "");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 w-full max-w-full px-2 mx-auto text-right items-top">
      <InputBox1
        name="brideFirst"
        titleName={`שם הכלה`}
        value={details.brideFirst}
        onChange={onChange}
        showError={isRequired?.("brideFirst") && !details.brideFirst}
        placeholder="למשל:שובל"
      />
      <InputBox1
        name="brideLast"
        titleName={`שם משפחת הכלה`}
        value={details.brideLast}
        onChange={onChange}
        showError={isRequired?.("brideLast") && !details.brideLast}
        placeholder="למשל:נקש"
      />
      <InputBox1
        name="groomFirst"
        titleName={`שם החתן${mark("groomFirst")}`}
        value={details.groomFirst}
        onChange={onChange}
        showError={isRequired?.("groomFirst") && !details.groomFirst}
        placeholder="למשל:דורון"
      />
      <InputBox1
        name="groomLast"
        titleName={`שם משפחת החתן${mark("groomLast")}`}
        value={details.groomLast}
        onChange={onChange}
        showError={isRequired?.("groomLast") && !details.groomLast}
        placeholder="למשל:אמונה"
      />
      <InputBox1
        name="date"
        titleName={`תאריך${mark("date")}`}
        type="date"
        value={details.date}
        onChange={onChange}
        // showError={isRequired?.("date") && !details.date}
        min={minDate}
        showError={isRequired?.("date") && !details.date}
        onBlur={onDateBlur}
        max={maxDate} // ← להעביר הלאה אם נדרש
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
        placeholder="למשל:אולמי נרניה"
      />
      <InputBox1
        name="address"
        titleName={`כתובת${mark("address")}`}
        value={details.address}
        onChange={onChange}
        showError={isRequired?.("address") && !details.address}
        placeholder="הרצל 85 באר שבע"
      />
    </div>
  );
};

export default EventDetailsWedding;
