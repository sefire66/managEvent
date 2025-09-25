"use client";

import { useRef, useState } from "react";

type Props = {
  currentImageUrl?: string | null;
  currentImagePath?: string | null;
  onUploadSuccess: (url: string, path: string) => void;
  /**
   * onDelete צריך לאפס במסד: imageUrl=null, imagePath=null
   * ולעדכן state בהורה (onUpdate(updated)) כדי שה-UI יתנקה.
   */
  onDelete?: () => void | Promise<void>;
};

const ImageUploader = ({
  currentImageUrl,
  currentImagePath,
  onUploadSuccess,
  onDelete,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 1) אם קיימת תמונה קודמת: מחיקה מה-Storage
      if (currentImagePath) {
        try {
          const delRes = await fetch("/api/supabase/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: currentImagePath }),
          });
          if (!delRes.ok) {
            const err = await delRes.json().catch(() => ({}));
            throw new Error("Storage delete failed: " + JSON.stringify(err));
          }
        } catch (err) {
          console.error("Storage delete error:", err);
          alert("שגיאה במחיקת הקובץ הישן מהאחסון");
          return; // עוצרים — לא ממשיכים אם לא נמחק
        }
      }

      // 2) איפוס מוחלט במסד (imageUrl/imagePath ל-null) דרך ההורה
      if (onDelete) {
        try {
          await onDelete();
        } catch (err) {
          console.error("DB clear (onDelete) error:", err);
          alert("שגיאה באיפוס פרטי התמונה במסד");
          return; // עוצרים אם לא התבצע איפוס במסד
        }
      }

      // 3) העלאת התמונה החדשה ל-Storage
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/supabase/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert("שגיאה בהעלאת התמונה: " + (data?.error ?? ""));
        return;
      }

      // 4) עדכון ההורה עם ה-URL וה-Path החדשים (ההורה ישמור במסד)
      onUploadSuccess(data.url, data.path);
    } catch (err) {
      console.error("Upload flow failed:", err);
      alert("העלאה נכשלה");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // ניקוי הקלט
    }
  };

  return (
    <div className="flex flex-row items-center justify-between py-0 bg-white rounded-lg w-full">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className="w-full text-center px-3 py-2 border border-blue-500 rounded-md text-blue-600 font-semibold text-sm hover:bg-blue-50 transition disabled:opacity-50 "
        aria-busy={uploading}
      >
        {uploading ? "מעלה..." : "העלה תמונה"}
      </div>
    </div>
  );
};

export default ImageUploader;
