import React, { useCallback, useEffect, useRef } from "react";
// import TableItem from "./table/TableItem";
import TableItem from "./TableItem";

import type { Table, Guest } from "../types/types";
import TableListToolbar from "./TableListToolbar";

interface TableListProps {
  tables: Table[];
  guests: Guest[];
  onEditTable: (table: Table) => void;
  onAddTable: () => void;
  shortView: boolean;
  toggleShortView: () => void;
  onGuestClick: (guest: Guest) => void; // ✅ add this
  successMessage?: string;
}

const TableList = ({
  tables,
  guests,
  onEditTable,
  onAddTable,
  shortView,
  toggleShortView,
  onGuestClick,
  successMessage,
}: TableListProps) => {
  // קונטיינר הגלילה של הגריד
  const containerRef = useRef<HTMLDivElement | null>(null);

  // רפרנסים לכל כרטיס שולחן (לפי מספר השולחן)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // מזהה השולחן שצריך לשמר סביב שינויים (anchor)
  const anchorTableRef = useRef<string | null>(null);

  // rAF ל-throttle של onScroll
  const scrollRaf = useRef<number | null>(null);

  // פונקציה שמחזירה את המפתח (מספר השולחן) הקרוב ביותר לראש הקונטיינר
  const getNearestKey = useCallback((): string | null => {
    const cont = containerRef.current;
    if (!cont) return null;
    const contTop = cont.getBoundingClientRect().top;

    let bestKey: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const [key, el] of Object.entries(itemRefs.current)) {
      if (!el) continue;
      const elTop = el.getBoundingClientRect().top;
      const dist = Math.abs(elTop - contTop);
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = key;
      }
    }
    return bestKey;
  }, []);

  // 🟧 פונקציה שעושה יישור מדויק לראש הקונטיינר (Top align)
  const scrollElToTop = useCallback((el: HTMLDivElement) => {
    const cont = containerRef.current;
    if (!cont) return;
    const delta =
      el.getBoundingClientRect().top - cont.getBoundingClientRect().top;
    cont.scrollBy({ top: delta, behavior: "auto" });
  }, []);

  // גלילה לעוגן (אם חסר, נבחר את הקרוב ביותר כרגע)
  const scrollToAnchor = useCallback(
    (
      options: {
        behavior?: ScrollBehavior;
        align?: "top" | "nearest";
      } = {}
    ) => {
      const { behavior = "auto", align = "nearest" } = options;
      const key = anchorTableRef.current || getNearestKey();
      if (!key) return;
      const el = itemRefs.current[key];
      if (!el) return;

      if (align === "top") {
        scrollElToTop(el as HTMLDivElement); // 🟧 יישור לראש
      } else {
        el.scrollIntoView({ block: "nearest", behavior }); // כמו קודם
      }
    },
    [getNearestKey, scrollElToTop]
  );

  // כשמחליפים מצב תצוגה – קודם נשמור את הקרוב לראש, ואז נחליף מצב
  const handleToggleView = useCallback(() => {
    anchorTableRef.current = getNearestKey();
    toggleShortView();
  }, [getNearestKey, toggleShortView]);

  // מעדכנים את העוגן בזמן גלילה (ומחסנים בעדינות עם rAF)
  const handleScroll = useCallback(() => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      anchorTableRef.current = getNearestKey();
    });
  }, [getNearestKey]);

  // אחרי שינוי shortView – גוללים לעוגן
  useEffect(() => {
    if (!containerRef.current) return;
    requestAnimationFrame(() => {
      scrollToAnchor({ behavior: "auto", align: "top" }); // 🟧 כאן הקסם
    });
  }, [shortView, scrollToAnchor]);

  // על שינוי רשימת השולחנות (הוספה/מיון/מחיקה) – נשמור/נגלול לעוגן
  useEffect(() => {
    if (!anchorTableRef.current) {
      anchorTableRef.current = getNearestKey();
    }
    requestAnimationFrame(() => {
      scrollToAnchor({ behavior: "auto", align: "top" });
    });
  }, [tables, getNearestKey, scrollToAnchor]);

  // על שינוי גודל חלון – נשמור עוגן ונגלול אליו בתום ה-resize (debounce)
  useEffect(() => {
    let timer: number | null = null;

    const onResize = () => {
      anchorTableRef.current = anchorTableRef.current || getNearestKey();
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToAnchor({ behavior: "auto", align: "top" });
        });
      }, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) window.clearTimeout(timer);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [getNearestKey, scrollToAnchor]);

  return (
    <div className="w-full border p-6 rounded-2xl shadow bg-white space-y-4 mb-15">
      <div className="flex flex-row items-center justify-between" dir="rtl">
        <TableListToolbar
          onAddTable={onAddTable}
          toggleShortView={handleToggleView}
          shortView={shortView}
          successMessage={successMessage}
        />
      </div>

      <div
        ref={containerRef}
        className="max-h-[600px] overflow-y-auto"
        style={{ direction: "ltr" }}
        onScroll={handleScroll} // 🟧 מאזין גלילה כדי לעדכן "עוגן" בזמן אמת
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-4 items-stretch content-start"
          // 🟧 הוספתי content-start כדי לוודא שהשורות יתחילו מלמעלה גם אם יש עודף גובה
          style={{ direction: "rtl" }}
        >
          {(tables || [])
            .slice()
            .sort((a, b) => parseInt(a.number) - parseInt(b.number))
            .map((table) => {
              return (
                <div
                  key={table.number}
                  ref={(el) => {
                    itemRefs.current[table.number] = el;
                  }}
                  className="h-full w-full min-w-0 flex flex-col justify-start items-start"
                  // 🟧 התא של ה-grid: נמתח לגובה מלא, והתוכן מתחיל תמיד מהחלק העליון
                >
                  <TableItem
                    table={table}
                    guests={guests}
                    onEdit={onEditTable}
                    onGuestClick={onGuestClick}
                    shortView={shortView}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default TableList;
