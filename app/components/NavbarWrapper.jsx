"use client";
import { useState, useState as ReactState } from "react";
import Navbar from "./Navbar";

const NavbarWrapper = () => {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <Navbar
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
        // onOpenDashboard={() => setShowDashboard(true)}
        // onCloseDashboard={() => setShowDashboard(false)}
      />

      {/* {showDashboard ? (
           <Dashboard />
          // <HeroSection isBlurred={loginOpen} />
        ) : (
          <HeroSection isBlurred={loginOpen} />
        )}
   */}
    </>
  );
};

export default NavbarWrapper;
