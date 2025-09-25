import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "./components/NavbarWrapper";
// import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { use } from "react";
import SessionProviderWrapper from "./components/SessionProviderWrapper";

// import { Inter } from 'next/font/google'

// const inter = Inter({ subsets: ['hebrew'] })
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "✨Manage & Event & RSVP",
  description:
    "כלי אישורי הגעה בעברית: שליחת קישורי RSVP, תזכורות אוטומטיות וסטטוסים בזמן אמת.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {" "}
        <SessionProviderWrapper>
          <NavbarWrapper />
          <main className="bg-[#FAF9F6] pt-1  min-h-screen">{children}</main>
          {/* <div className="mb-28  " /> */}
        </SessionProviderWrapper>
        <Footer />
      </body>
    </html>
  );
}
