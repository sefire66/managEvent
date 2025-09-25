"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Menu, X, Loader2 } from "lucide-react";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import ForgotPasswordModal from "./ForgotPasswordModal";
import Logo from "./Logo";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // 🔵 ניווט לעמוד הראשי + אוברליי מקומי (עם אנטי-הבהוב)
  const [isHomeNavigating, setIsHomeNavigating] = useState(false);
  const [isHomeDebouncedOn, setIsHomeDebouncedOn] = useState(false);
  const fromPathRef = useRef<string | null>(null); // מאיזה נתיב יצאנו

  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const verifiedHandledRef = useRef(false);

  // הסתרת ה-Navbar במסכים מסוימים
  if (
    pathname?.startsWith("/host") ||
    pathname?.startsWith("/invite") ||
    pathname?.startsWith("/rsvp") ||
    pathname?.startsWith("/reception/notice")
  ) {
    return null;
  }

  // טיפול בפרמטר ?verified=true לפתיחת לוגין
  useEffect(() => {
    if (verifiedHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get("verified") === "true";
    if (isVerified) {
      verifiedHandledRef.current = true;
      setTimeout(() => setLoginOpen(true), 0);
      params.delete("verified");
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // 🕒 Debounce להצגת האוברליי (מניעת הבהוב): מציגים רק אם עברו 200ms
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isHomeNavigating) {
      t = setTimeout(() => setIsHomeDebouncedOn(true), 200);
    } else {
      setIsHomeDebouncedOn(false);
    }
    return () => t && clearTimeout(t);
  }, [isHomeNavigating]);

  // ✅ כשמגיעים ל"/" – לכבות מיד את מצב הניווט (בלי "כיבוי רך")
  useEffect(() => {
    if (isHomeNavigating && pathname === "/") {
      setIsHomeNavigating(false);
      fromPathRef.current = null;
    }
  }, [pathname, isHomeNavigating]);

  // 🛡️ Safety timeout: אם משהו נתקע, נכבה אחרי 10 שניות
  useEffect(() => {
    if (!isHomeNavigating) return;
    const t = setTimeout(() => setIsHomeNavigating(false), 10000);
    return () => clearTimeout(t);
  }, [isHomeNavigating]);

  // 🖱️ לחיצה על הלוגו — מפעילה אוברליי ומנווטת ל"/" (מתחשב בפתיחה בטאב חדש)
  const handleLogoClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // אם כבר בעמוד הראשי — לא עושים כלום
    if (pathname === "/") return;

    // פתיחה בטאב חדש — לא מפעילים אוברליי, מכבדים את רצון המשתמש
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
      window.open("/", "_blank");
      return;
    }

    e.preventDefault();
    if (isOpen) setIsOpen(false); // סגירת תפריט מובייל אם פתוח
    fromPathRef.current = pathname; // מאיפה יצאנו
    setIsHomeNavigating(true); // מצב ניווט פעיל
    router.push("/"); // ניווט
  };

  // ===== חלקים =====
  const NavLogo = () => (
    <div
      className="flex justify-center"
      onClick={handleLogoClick}
      style={{ cursor: "pointer" }}
      title="מעבר למסך ראשי"
      aria-label="מעבר למסך ראשי"
    >
      <Logo />
    </div>
  );

  const NavHamburger = () => (
    <button
      className="text-black"
      onClick={() => setIsOpen(true)}
      aria-label="פתח תפריט"
      title="תפריט"
    >
      <Menu size={28} />
    </button>
  );

  const NavMenu = () => (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-base font-medium text-gray-800">
      {/* <li>
        <Link
          href="/"
          className="block px-1 py-1 hover:text-blue-400 transition hover:bg-white rounded-2xl "
        >
          ראשי
        </Link>
      </li> */}
      <li>
        <Link
          href="/dashboard"
          className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
        >
          לוח בקרה
        </Link>
      </li>
      <li>
        <Link
          href="/pricing"
          className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
        >
          מחירים
        </Link>
      </li>
      <li>
        <Link
          href="/reviews"
          className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
        >
          חוות דעת
        </Link>
      </li>
      <li>{/* gifts (כבוי) */}</li>
      <li>
        <Link
          href="/contactus"
          className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
        >
          צור קשר
        </Link>
      </li>
      {session?.user?.role &&
        ["admin", "super-admin"].includes(session.user.role) && (
          <li>
            <Link
              href="/adminDashboard"
              className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
            >
              דשבורד ניהולי
            </Link>
          </li>
        )}
    </ul>
  );

  const NavAuth = () => (
    <>
      {session ? (
        <div className="flex items-center gap-3 px-2 text-sm  max-w-[70vw] md:max-w-none truncate">
          <span className="text-gray-700 truncate">
            שלום, {session.user?.name || session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-700 underline"
            style={{ cursor: "pointer" }}
          >
            התנתק
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-2 text-sm font-bold">
          <button
            onClick={() => setLoginOpen(true)}
            className="text-gray-700 underline"
            style={{ cursor: "pointer" }}
          >
            התחברות
          </button>
          <button
            onClick={() => setRegisterOpen(true)}
            className="text-gray-700 underline"
            style={{ cursor: "pointer" }}
          >
            הרשמה
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        className={`${
          loginOpen || registerOpen || forgotOpen ? "backdrop-blur-sm" : ""
        }`}
      >
        <nav
          className="w-full bg-white/80 fixed top-0 left-0 z-20 border-b border-gray-300 "
          dir="rtl"
          aria-busy={isHomeNavigating && isHomeDebouncedOn ? "true" : "false"}
        >
          <div
            className="relative w-[90%] max-w-5xl mx-auto
            mt-0 px-2 py-1 
            bg-gradient-to-l from-pink-400 to-white
            rounded-3xl shadow-lg ring-1 ring-black/5
            overflow-hidden"
          >
            {/* ===== מובייל ===== */}
            <div className="md:hidden">
              {/* שורה 1: לוגו ממורכז */}
              <div className="pt-0">
                <NavLogo />
              </div>

              {/* שורה 2: המבורגר מימין, התחברות במרכז */}
              <div className="relative h-10 flex items-center">
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  {!isOpen && <NavHamburger />}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                  <NavAuth />
                </div>
              </div>
            </div>

            {/* ===== דסקטופ (Grid: auto 1fr auto) ===== */}
            <div className="hidden md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-4 py-2 min-h-[48px]">
              {/* לוגו בצד ימין – לא מתכווץ ולא נחתך */}
              <div className="justify-self-end pr-2 shrink-0">
                <NavLogo />
              </div>

              {/* תפריט במרכז – תופס את השאר; אם צר, מקבל גלילה אופקית קלה */}
              <div className="justify-self-center max-w-full overflow-x-auto">
                <NavMenu />
              </div>

              {/* התחברות בצד שמאל – לא מתכווץ */}
              <div className="justify-self-start pl-2 shrink-0">
                <NavAuth />
              </div>
            </div>
          </div>

          {/* ===== תפריט מובייל (off-canvas) ===== */}
          <div
            className={`fixed top-0 right-0 bg-gray-300 z-50 h-full w-64 shadow-lg border-l border-gray-400 flex flex-col items-end pt-4 px-4 transform transition-transform duration-300 ease-in-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="w-full flex justify-end">
              <button
                className="text-gray-800 mb-4"
                onClick={() => setIsOpen(false)}
                aria-label="סגור תפריט"
              >
                <X size={28} />
              </button>
            </div>
            <ul className="flex flex-col gap-4 text-sm font-medium text-gray-800 text-right pr-4 w-full">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    // אותו טיפול כמו בלוגו
                    if (pathname === "/") return;
                    if (
                      e.metaKey ||
                      e.ctrlKey ||
                      e.shiftKey ||
                      e.altKey ||
                      e.button === 1
                    ) {
                      window.open("/", "_blank");
                      return;
                    }
                    e.preventDefault();
                    setIsOpen(false); // סגירת תפריט מובייל
                    fromPathRef.current = pathname;
                    setIsHomeNavigating(true);
                    router.push("/");
                  }}
                  className="block px-1 py-1 hover:text-blue-500 transition hover:bg-white rounded-2xl"
                >
                  ראשי
                </a>
              </li>

              <li>
                <Link href="/dashboard">לוח בקרה</Link>
              </li>
              <li>
                <Link href="/pricing">מחירים</Link>
              </li>
              <li>
                <Link href="/reviews">חוות דעת</Link>
              </li>
              <li>
                <Link href="/contactus">צור קשר</Link>
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
        </nav>
      </div>

      {/* 🟣 אוברליי — יוצג רק אם עדיין בנתיב הישן (אין הבהוב על הדף החדש) */}
      {isHomeNavigating &&
        isHomeDebouncedOn &&
        pathname === fromPathRef.current && (
          <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/80"
            aria-live="polite"
            aria-label="טוען עמוד"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin" />
              <span className="text-sm text-gray-700">טוען עמוד…</span>
            </div>
          </div>
        )}

      {/* מודאלים */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        onSwitchToForgot={() => {
          setLoginOpen(false);
          setForgotOpen(true);
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
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSwitchToLogin={() => {
          setForgotOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
};

export default Navbar;
