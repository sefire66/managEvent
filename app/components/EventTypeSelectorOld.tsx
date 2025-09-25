import React from "react";

const events = [
  {
    label: "חתונה",
    value: "wedding",
    img: "/images/wedding-3d.jpg",
    // img: "https://img.icons8.com/ios-filled/100/000000/wedding-rings.png",
    
  },
  {
    label: "יום הולדת",
    value: "birthday",
    img: "/images/birthday-3d.jpg",
    // img: "https://img.icons8.com/ios-filled/100/000000/birthday-cake.png",
  },
  {
    label: "לידה",
    value: "baby-born",
    img: "/images/baby-3d.jpg",
    // img: "https://img.icons8.com/ios-filled/100/000000/baby.png",
  },
  {
    label: "בר/בת מצווה",
    value: "bar-mitzva",
    img: "https://img.icons8.com/ios-filled/100/000000/torah.png",
  },
  {
    label: "אירוע עסקי",
    value: "business-event",
     img: "/images/buisiness-woman-3d.jpg",
    // img: "https://img.icons8.com/ios-filled/100/000000/conference.png",
  },
];

const EventTypeSelector = () => (
  <div className="mt-2 flex flex-col items-center ">
    <label className="mb-4 text-lg font-semibold">בחרו את סוג האירוע שלכם:</label>
    <div className="flex flex-wrap gap-4 justify-center">
      {events.map((event) => (
        <button
          key={event.value}
          className="flex flex-col items-center bg-[#c9cdd1] text-blue-700 border border-blue-600 rounded-xl px-2 py-2 text-lg font-medium hover:bg-blue-600 hover:text-white transition w-32"
        >
          <img src={event.img} alt={event.label} className="w-full  h-38 mb-0" />
          
          {event.label}
        </button>
      ))}
    </div>
  </div>
);

export default EventTypeSelector;