const MainDescription = () => {
  return (
    <div
      className="py-1 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-gray-800 pt-4 mt-36 mb-16 bg-white rounded-lg shadow-lg"
      dir="rtl"
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-blue-800 text-center ">
        ברוכים הבאים
      </h1>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-blue-700 text-center">
        מארגנים אירוע?
      </h2>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-blue-700 text-center">
        אנחנו המקום שיהפוך את זה לפשוט, חכם ושמח
      </h2>

      <p className="text-base sm:text-lg md:text-xl mb-8 text-center leading-relaxed">
        בין אם אתם חוגגים חתונה, בר מצווה או יום הולדת - אצלנו תמצאו את כל מה
        שצריך כדי להפוך את האירוע לחוויה דיגיטלית בלתי נשכחת.
      </p>

      <ul className="text-right list-disc pr-4 sm:pr-6 space-y-3 text-sm sm:text-base md:text-lg">
        <li>הזמנות דיגיטליות וניהול אישורי הגעה</li>
        {/* <li>ניהול אישורי הגעה</li> */}
        {/* <li>תכנון והזמנת ספקים בקלות</li> */}
        <li>לוח בקרה אישי לכל לקוח</li>
        <li>יצירת דף אירוע מעוצב</li>
        <li>תשלום באשראי לאירועים</li>
        {/* <li>תמונות וסרטונים מהאירוע</li> */}
        <li>רשימות משתתפים, סידור שולחנות, תפריטים ועוד</li>
      </ul>

      <p className="mt-8 text-base sm:text-lg md:text-xl font-semibold text-blue-600 text-center">
        האירוע שלכם. הסגנון שלכם. אנחנו פשוט עושים את זה קל.
      </p>
    </div>
  );
};

export default MainDescription;

// This component provides a main description section for an event planning platform.
