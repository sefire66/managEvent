"use client";
import { useState } from "react";

const WeddingInvitationForm = () => {
  const [formData, setFormData] = useState({
    groomFirstName: "",
    groomLastName: "",
    brideFirstName: "",
    brideLastName: "",
    groomParents: "",
    brideParents: "",
    weddingDate: "",
    weddingTime: "",
    venueName: "",
    venueAddress: "",
    image: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // send formData to server or render preview
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 space-y-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold">יצירת הזמנה לחתונה</h2>

      <div className="grid grid-cols-2 gap-4">
        <input name="groomFirstName" placeholder="שם החתן" className="input" onChange={handleChange} />
        <input name="groomLastName" placeholder="שם משפחה של החתן" className="input" onChange={handleChange} />

        <input name="brideFirstName" placeholder="שם הכלה" className="input" onChange={handleChange} />
        <input name="brideLastName" placeholder="שם משפחה של הכלה" className="input" onChange={handleChange} />
      </div>

      <input name="groomParents" placeholder="שמות ההורים של החתן" className="input w-full" onChange={handleChange} />
      <input name="brideParents" placeholder="שמות ההורים של הכלה" className="input w-full" onChange={handleChange} />

      <div className="grid grid-cols-2 gap-4">
        <input type="date" name="weddingDate" className="input" onChange={handleChange} />
        <input type="time" name="weddingTime" className="input" onChange={handleChange} />
      </div>

      <input name="venueName" placeholder="שם האולם" className="input w-full" onChange={handleChange} />
      <input name="venueAddress" placeholder="כתובת האולם" className="input w-full" onChange={handleChange} />

      <div>
        <label className="block font-medium">תמונה להזמנה</label>
        <input type="file" name="image" accept="image/*" onChange={handleChange} />
        <p className="text-sm text-gray-600 mt-1">או בחר מהספריה שלנו</p>
        {/* אפשר להוסיף כאן קומפוננטת גלריה עם תמונות מוכנות */}
      </div>

      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
        צור הזמנה
      </button>
    </form>
  );
};

export default WeddingInvitationForm;
