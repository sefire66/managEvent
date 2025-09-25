"use client";

import InputBox1 from "./ui/InputBox1";
import { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRequired?: (field: string) => boolean;
  minDate?: string; // ← חדש
};

const EventDetailsBarMitzvah = ({
  details,
  onChange,
  isRequired,
  minDate,
}: Props) => {
  const mark = (field: string) => (isRequired?.(field) ? "" : "");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 w-full max-w-full px-2 mx-auto text-right items-top">
      <InputBox1
        name="groomFirst"
        titleName="שם החתן"
        value={details.groomFirst}
        onChange={onChange}
        showError={isRequired?.("groomFirst") && !details.groomFirst}
      />
      <InputBox1
        name="groomLast"
        titleName="שם המזמין"
        value={details.groomLast}
        onChange={onChange}
        showError={isRequired?.("groomLast") && !details.groomLast}
        placeholder="משפ יפרח / שני ויוסי יפרח"
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

export default EventDetailsBarMitzvah;
