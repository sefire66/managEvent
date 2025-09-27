import React, { useState } from "react";
import PricingComponent from "../components/PricingComponent";
import PackagesViaI4U from "../components/PackagesViaI4U";

export default function Pricing() {
  // הדמיית השהייה כדי להכריח טעינה

  return (
    <div className="flex flex-col items-center  justify-center min-h-screen py-8 ">
      <div
        className="relative w-[90%] max-w-5xl flex items-center justify-center 
            mt-0 sm:mt-2 px-4 sm:px-6 py-3"
      >
        <img
          src="/images/pexels-jeremy-wong-382920-1023233.jpg"
          // src="/images/pexels-deesha-chandra-4156-35981.jpg"
          alt="Pricing illustration"
          className="max-w-[1100px] w-full h-[320px] object-cover rounded-xl shadow-lg mt-18"
        />
      </div>

      {/* <img
        src="/images/pexels-deesha-chandra-4156-35981.jpg" // קובץ שישב ב-public/images/
        alt="Pricing illustration"
        className="mx-auto mb-2 w-full max-w-md rounded-xl shadow mt-20"
      /> */}

      {/* <h1 className="text-4xl font-bold mb-8">מחירים</h1> */}

      {/* <PricingComponent /> */}
      <PackagesViaI4U />
    </div>
  );
}
