"use client";

import { useRef, useState } from "react";

type Props = {
  currentImageUrl?: string;
  currentImagePath?: string;
  onUploadSuccess: (url: string, path: string) => void;
};

const ImageUploader = ({
  currentImageUrl,
  currentImagePath,
  onUploadSuccess,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // מחיקת תמונה קודמת אם קיימת
      if (currentImagePath) {
        await fetch("/api/supabase/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: currentImagePath }),
        });
      }

      // העלאת תמונה חדשה
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/supabase/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        onUploadSuccess(data.url, data.path);
      } else {
        alert("שגיאה בהעלאת התמונה: " + data.error);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-row items-center justify-between p-4 bg-white rounded-lg ">
      <div className="text-right space-y-2">
        {/* {currentImageUrl && (
          <div className="mb-2">
            <img
              src={currentImageUrl}
              alt="הזמנה"
              className="w-full max-w-sm rounded shadow"
            />
          </div>
        )} */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
      <div>
        <button
          type="button"
          className="flex items-center justify-center gap-1 px-4 py-2 border border-blue-500 text-blue-600 font-semibold text-sm rounded-md hover:bg-blue-50 transition min-w-[100px] "
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "מעלה..." : "בחר תמונה"}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
