"use client";

import { useState } from "react";

type Props = {
  title?: string;
  subTitle?: string;
};

const AccordionHeader = ({ title, subTitle }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 mt-5 mb-4 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-5 border-blue-500 "
      dir="rtl"
      onClick={() => setIsOpen(!isOpen)}
      style={{ cursor: "pointer" }}
    >
      <div className="flex flex-row items-center gap-2 min-w-[220px]">
        <div
          className={`text-2xl text-blue-600 transform transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          {isOpen ? "−" : "+"}
        </div>
        <div className="font-bold text-blue-700 text-xl min-w-[220px]">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-3">
            {title}
          </h2>
          <p className="text-lg sm:text-xl font-normal text-gray-700">
            {subTitle}
          </p>
        </div>
      </div>
    </section>
  );
};

export default AccordionHeader;
