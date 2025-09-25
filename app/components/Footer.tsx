"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const hideOn = ["/host", "/invite", "/rsvp"];
  const shouldHide = hideOn.some((p) => pathname?.startsWith(p));

  if (shouldHide) return null;

  return (
    <footer
      dir="rtl"
      className="mt-auto w-full bg-black/70 text-white py-4 text-center"
    >
      <p className="text-sm">
        &copy; {new Date().getFullYear()} ManagEvent. כל הזכויות שמורות.
      </p>
    </footer>
  );
}
