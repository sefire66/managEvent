"use client";

import { useRef } from "react";
import Image from "next/image";
import type { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  useBackground: boolean;
  setUseBackground: (value: boolean) => void;
};

const WeddingInvitationPreview = ({
  details,
  imageUrl,
  setImageUrl,
  useBackground,
  setUseBackground,
}: Props) => {
  const {
    groomFirst,
    groomLast,
    brideFirst,
    brideLast,
    // groomParents,
    // brideParents,
    date,
    time,
    venue,
    address,
  } = details;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImageUrl(imageUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          הוסף תמונה
        </button>
        <button
          onClick={handleRemoveImage}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          הסר תמונה
        </button>
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={useBackground}
            onChange={(e) => setUseBackground(e.target.checked)}
          />
          השתמש כתמונה כרקע
        </label>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      <div
        className={`flex-1 rounded-xl shadow-lg overflow-hidden p-6 text-center space-y-4 border border-gray-300 ${
          useBackground ? "bg-cover bg-center text-white" : "bg-white"
        }`}
        style={
          useBackground && imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : {}
        }
      >
        {!useBackground && imageUrl && (
          <div className="w-full h-64 relative">
            <Image
              src={imageUrl}
              alt="Invitation Background"
              layout="fill"
              objectFit="cover"
              className="rounded-t-xl"
            />
          </div>
        )}
        <h2 className="text-2xl font-bold text-black">הזמנה לחתונה</h2>
        <p className="text-lg font-medium">
          {groomFirst} {groomLast} & {brideFirst} {brideLast}
        </p>
        {/* <p className="text-sm text-gray-700">
          ילדי {groomParents} ו־{brideParents}
        </p> */}
        <p className="text-md mt-2">
          מתכבדים להזמינכם לחגוג עימנו את יום נישואינו
        </p>
        <p className="font-semibold text-black">
          {date} בשעה {time}
        </p>
        <p className="text-gray-700">באולם {venue}</p>
        <p className="text-gray-600">{address}</p>
      </div>
    </div>
  );
};

export default WeddingInvitationPreview;
