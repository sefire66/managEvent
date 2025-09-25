import * as React from "react";
import HeroSection from "./components/HeroSection";
import Background from "./components/Background";

export default function Home() {
  return (
    // <main dir="rtl" className="flex flex-col min-h-screen relative text-black bg-[#F5F5F5]">
    <main dir="rtl" className=" text-black ">
      {/* <Background /> */}
      <HeroSection />
      <div className="flex-grow  " />
    </main>
  );
}
