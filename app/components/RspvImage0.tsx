"use client";

import { useState } from "react";
import ImageUploader from "./ImageUploader";
import type { EventDetails } from "../types/types";

type Props = {
  event: EventDetails;
  onUpdate: (updatedEvent: EventDetails) => void;
};

const RspvImage = ({ event, onUpdate }: Props) => {
  const [saving, setSaving] = useState(false);

  const handleUploadSuccess = async (url: string, path: string) => {
    setSaving(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          imageUrl: url,
          imagePath: path,
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        console.error("❌ Error saving updated image URL");
        alert("שגיאה בשמירת התמונה");
      } else {
        onUpdate(updated);
      }
    } catch (err) {
      console.error("Error updating event image:", err);
      alert("שגיאה כללית");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-1 rounded-2xl max-w-4xl mx-auto w-full mb-1">
      {/* <div className="bg-white p-4 rounded-xl shadow max-w-2xl mx-auto text-right"> */}
      <h2 className="text-xl font-bold text-blue-700 mb-4">תמונת ההזמנה</h2>

      <ImageUploader
        currentImageUrl={event.imageUrl}
        currentImagePath={event.imagePath}
        onUploadSuccess={handleUploadSuccess}
      />

      {saving && <p className="text-sm text-gray-500 mt-2">שומר תמונה...</p>}
    </div>
  );
};

export default RspvImage;
