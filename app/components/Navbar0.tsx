"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import { useSession, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
import { useRouter, usePathname } from "next/navigation"; // ⬅️ הוספה

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const verifiedHandledRef = useRef(false);

  useEffect(() => {
    if (verifiedHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get("verified") === "true";

    if (isVerified) {
      verifiedHandledRef.current = true;

      // פותח את המודל (טיק קטן כדי להימנע מיריבות עם הידרציה)
      setTimeout(() => setLoginOpen(true), 0);

      // מנקה את הפרמטר בלי ניווט (לא עושה רימאונט)
      params.delete("verified");
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // ⬇️ במקום useSearchParams
  // useEffect(() => {
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const verified = urlParams.get("verified");

  //   console.log("===============🔍 verified param:==========", verified); // ⬅️ בדוק שזה עובד

  //   if (verified === "true") {
  //     setLoginOpen(true);
  //     router.replace("/", { scroll: false }); // מנקה את ה-URL
  //   }
  // }, [router]);

  return (
    <>
      <div className={loginOpen || registerOpen ? "backdrop-blur-sm" : ""}>
        <nav
          className="w-full bg-white bg-opacity-80 fixed top-0 left-0 z-20 border-b max-h-30 border-gray-300"
          dir="rtl"
        >
          <div className="flex flex-row relative max-w-[1400px] mx-auto items-center justify-between px-5 py-3 min-h-[80px] ">
            {/* hamburger */}
            <div className="flex items-center gap-4 ">
              {!isOpen && (
                <button
                  className="md:hidden text-black z-30 relative"
                  onClick={() => setIsOpen(true)}
                >
                  <Menu size={28} />
                </button>
              )}
              <div
                className="bg-blue-100 py-1  px-3 rounded-full  shadow-md w-fit text-center whitespace-nowrap"
                dir="ltr"
              >
                <div className="text-md font-bold text-blue-800">
                  managevent.co.il
                </div>
                <div
                  className="text-sm text-blue-700 font-medium mt-1 flex items-center justify-center gap-1"
                  dir="rtl"
                >
                  <span>מארגנים</span>
                  <span className="text-yellow-500">✨</span>
                  <span>מאשרים</span>
                  <span className="text-yellow-500">✨</span>
                  <span>חוגגים</span>
                </div>
              </div>

              {session ? (
                <div className="flex flex-wrap items-center gap-2 px-4">
                  <span className="text-gray-700">
                    שלום, {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-gray-700 underline"
                  >
                    התנתק
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 px-4">
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="text-gray-700 underline"
                  >
                    התחברות
                  </button>
                  <button
                    onClick={() => setRegisterOpen(true)}
                    className="text-gray-700 underline"
                  >
                    הרשמה
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:flex flex-1 justify-center items-center">
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm sm:text-base md:text-lg font-medium  text-gray-800 text-center pointer-events-auto ">
                <li>
                  <Link href="/" className="hover:text-blue-400 transition">
                    ראשי
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-blue-500 transition"
                  >
                    לוח בקרה
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-blue-500 transition"
                  >
                    מחירים
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reviews"
                    className="hover:text-blue-500 transition"
                  >
                    חוות דעת
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gifts"
                    className="hover:text-blue-500 transition"
                  >
                    מתנות באשראי
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contactus"
                    className="hover:text-blue-500 transition"
                  >
                    צור קשר
                  </Link>
                </li>
                {session?.user?.role &&
                  ["admin", "super-admin"].includes(session.user.role) && (
                    <li>
                      <Link
                        href="/adminDashboard"
                        className="hover:text-blue-500 transition"
                      >
                        דשבורד ניהולי
                      </Link>
                    </li>
                  )}
              </ul>
            </div>
          </div>
        </nav>
      </div>

      {/* Modals */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchToLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
};

export default Navbar;
