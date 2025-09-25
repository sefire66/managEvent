"use client";

import { useEffect, useRef } from "react";

type Props = {
  imageDataUrl: string;
  setImageDataUrl: (url: string) => void;
};

const InvitationImage = ({ imageDataUrl, setImageDataUrl }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("invitationImage");
    if (stored) setImageDataUrl(stored);
  }, []);

  useEffect(() => {
    if (imageDataUrl) {
      localStorage.setItem("invitationImage", imageDataUrl);
    }
  }, [imageDataUrl]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageDataUrl("");
    localStorage.removeItem("invitationImage");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    // <div className="bg-gray-400 rounded-xl shadow p-6 text-center space-y-4 max-h-[600px] max-w-[600px] items-center justify-center mx-auto">

    <div className="flex flex-col justify-center items-center my-4">
      <div className="">
        <h2 className="text-xl font-bold text-blue-700">
          תמונה שתשולב בהזמנה{" "}
        </h2>
      </div>
      <div className="flex justify-center items-center my-4 ">
        {imageDataUrl ? (
          <img
            src={imageDataUrl}
            alt="Invitation"
            className="w-full h-auto  object-cover mx-auto rounded-lg shadow max-h-[420px]"
          />
        ) : (
          <p className="text-gray-600">לא הועלתה תמונה</p>
        )}
      </div>
      <div className="flex justify-center items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="p-2 w-fit rounded-2xl h-10           
           hover:border-red-800 border border-blue-700 text-blue-700 cursor-pointer"
        />
        {imageDataUrl && (
          <button
            onClick={handleClearImage}
            className="text-red-600 hover:text-red-800 border border-red-600 hover:border-red-800 px-3 py-1 rounded-2xl h-10"
          >
            מחק תמונה
          </button>
        )}
      </div>
    </div>
  );
};

export default InvitationImage;
