import React from "react";
import {
  Mail,
  UserCircle,
  Palette,
  CreditCard,
  ListChecks,
  Images,
  Handshake,
  LayoutGrid,
} from "lucide-react";

type FitMode = "contain" | "cover" | "scroll";
type TextSide = "right" | "left";

type ShowcaseItem = {
  title: string;
  description: string;
  src: string;
  alt: string;
  icon: React.ReactNode;
  fit?: FitMode; // ברירת מחדל: "contain"
  heightClass?: string; // ברירת מחדל: "h-[460px]"
  textSide: TextSide; // "right" | "left"
};

const features = [
  {
    icon: <Mail className="w-6 h-6 mt-1 text-pink-500" />,
    text: "הזמנות דיגיטליות וניהול אישורי הגעה (RSVP)",
  },
  {
    icon: <UserCircle className="w-6 h-6 mt-1 text-green-600" />,
    text: "לוח בקרה אישי לכל לקוח",
  },
  {
    icon: <Palette className="w-6 h-6 mt-1 text-purple-500" />,
    text: "יצירת דף אירוע מעוצב",
  },
  // {
  //   icon: <CreditCard className="w-6 h-6 mt-1 text-yellow-500" />,
  //   text: "תשלום באשראי לאירועים",
  // },
  {
    icon: <Handshake className="w-6 h-6 mt-1 text-cyan-600" />,
    text: "שולחן קבלת פנים, ברכות",
  },
  {
    icon: <ListChecks className="w-6 h-6 mt-1 text-cyan-600" />,
    text: "רשימות משתתפים, סידור שולחנות, תפריטים ועוד",
  },

  //   {
  //   icon: <LayoutGrid className="w-6 h-6 mt-1 text-cyan-600" />,
  //   text: "סידור שולחנות, תפריטים ועוד",
  // },
];

const showcases: ShowcaseItem[] = [
  {
    title: "סידור שולחנות אינטראקטיבי",
    description:
      "העברה פשוטה של אורחים לשולחן, חישוב מקומות פנויים ותצוגה ויזואלית ברורה של כל האולם , כל שמות האורחים הם אקטיבים.",
    src: "/images/table_img.jpg",
    alt: "תצוגת סידור שולחנות",
    icon: <LayoutGrid className="w-5 h-5" />,
    fit: "contain",
    heightClass: "h-[300px]", // מתאים לתמונה רחבה
    textSide: "right", // תיאור מימין לתמונה
  },
  {
    title: "דף הזמנה + אישורי הגעה בזמן אמת",
    description:
      "עמוד הזמנה מעוצב שבו האורחים מאשרים הגעה, מציינים מספר מוזמנים ומשאירים הודעות.",
    src: "/images/rsvp-view-sample.jpg",
    alt: "תצוגת RSVP",
    icon: <Images className="w-5 h-5" />,
    fit: "contain",
    heightClass: "h-[460px]",
    textSide: "left", // תיאור משמאל לתמונה
  },
];

function ShowcaseMedia({
  src,
  alt,
  fit = "contain",
  heightClass = "h-[460px]",
}: {
  src: string;
  alt: string;
  fit?: FitMode;
  heightClass?: string;
}) {
  if (fit === "scroll") {
    return (
      <div
        className={`relative w-full ${heightClass} overflow-y-auto bg-gray-50`}
      >
        <img
          src={src}
          alt={alt}
          className="block w-full h-auto"
          loading="lazy"
        />
      </div>
    );
  }
  if (fit === "cover") {
    return (
      <div className={`relative w-full ${heightClass} bg-gray-50`}>
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  // contain – מציג את כל התמונה במסגרת קבועה, בלי חיתוך
  return (
    <div className={`relative w-full ${heightClass} bg-gray-50`}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

/** שורה של הדגמה: מסדר טקסט ותמונה זה לצד זה ב־md+; במובייל נערם אנכי */
function ShowcaseRow({ item }: { item: ShowcaseItem }) {
  const TextBlock = (
    <div className="p-4 md:p-6 flex items-start">
      <div>
        <div className="flex items-center gap-2 text-blue-700 mb-1">
          {item.icon}
          <h4 className="text-lg sm:text-xl font-bold">{item.title}</h4>
        </div>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          {item.description}
        </p>
      </div>
    </div>
  );

  const MediaBlock = (
    <ShowcaseMedia
      src={item.src}
      alt={item.alt}
      fit={item.fit}
      heightClass={item.heightClass}
    />
  );

  // ב־RTL, הילד הראשון יהיה מיושר לימין. לכן:
  // textSide="right" => טקסט ראשון (מימין), תמונה שנייה (משמאל)
  // textSide="left"  => תמונה ראשונה (מימין), טקסט שני (משמאל)
  const children =
    item.textSide === "right"
      ? [TextBlock, MediaBlock]
      : [MediaBlock, TextBlock];

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        {children.map((c, i) => (
          <div key={i} className="md:flex-1">
            {c}
          </div>
        ))}
      </div>
    </article>
  );
}

const MainDescription = () => {
  return (
    <div
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6  lg:px-8  mt-22 sm:mt-26 xl:mt-24 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px]"
      dir="rtl"
    >
      {/* כותרות – כמו המקור */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-blue-800 mb-6 text-center">
        ברוכים הבאים
      </h1>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 mb-3 text-center">
        מארגנים אירוע?
      </h2>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 mb-6 text-center">
        אנחנו המקום שיהפוך את זה לפשוט, חכם ושמח
      </h2>

      <p className="text-base sm:text-lg md:text-xl mb-10 text-center leading-relaxed">
        בין אם אתם חוגגים חתונה, בר מצווה או יום הולדת – אצלנו תמצאו את כל מה
        שצריך כדי להפוך את האירוע לחוויה דיגיטלית בלתי נשכחת.
      </p>
      {/* =========================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-6">
        {/* רשימה */}
        <div className="space-y-4 text-sm sm:text-base md:text-lg leading-relaxed flex-1 min-w-[260px]">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              {f.icon}
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* תמונה ממלאת את השטח שנותר */}
        <div className="">
          <img
            src="/images/pexels-freestockpro-341372.jpg"
            alt=""
            className="w-full h-[260px] object-cover rounded-xl"
          />
        </div>
      </div>

      {/* =============================================== */}
      {/* מפריד עדין */}
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

      {/* דוגמאות מהמערכת – אחת מתחת לשנייה, עם יישור טקסט לפי בקשתך */}
      <div className="mb-8">
        <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-5 text-center">
          דוגמאות מהמערכת
        </h3>

        <div className="flex flex-col gap-6">
          {showcases.map((item, idx) => (
            <ShowcaseRow key={idx} item={item} />
          ))}
        </div>
      </div>

      {/* סיום */}
      <p className="mt-6 text-base sm:text-lg md:text-xl text-blue-600 text-center font-semibold">
        האירוע שלכם. הסגנון שלכם. אנחנו פשוט עושים את זה חכם.
      </p>
    </div>
  );
};

export default MainDescription;
