import * as React from "react";
import HeroSection from "./components/HeroSection";
import Dashboard from "./components/ClientDashboard";

export default function Home() {
  return (
    <main
      dir="rtl"
      className="flex flex-col min-h-screen relative text-black bg-[#F5F5F5]"
    >
      {/* <Background /> */}
      <HeroSection isBlurred={false} />
      {/* <HeroSection /> */}
      {/* <Dashboard /> */}
      <div className="flex-grow" />
    </main>
  );
}
