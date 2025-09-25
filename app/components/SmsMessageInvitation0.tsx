"use client";

import React from "react";
import type { EventDetails } from "../types/types";
import type { Guest } from "../types/types";
import {
  generateSmsMessageByType,
  SmsType,
} from "@/lib/generateSmsMessageByType";

type Props = {
  details: EventDetails;
  guest: Guest;
  type: SmsType;
};

const SmsMessageInvitation = ({ details, guest, type }: Props) => {
  const rsvpLink =
    type === "invitation" || type === "reminder"
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${guest._id}`
      : "";

  const message = generateSmsMessageByType(type, guest, details, rsvpLink);

  return (
    <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto">
      <h2 className="text-lg font-bold text-blue-700 mb-2">תצוגת הודעת SMS</h2>
      <pre className="whitespace-pre-wrap text-right text-sm text-gray-800">
        {message}
      </pre>
    </div>
  );
};

export default SmsMessageInvitation;
