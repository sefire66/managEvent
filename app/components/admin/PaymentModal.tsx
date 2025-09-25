"use client";

import React, { useEffect } from "react";

// ---------- Types ----------
export type PaymentModalPayment = {
  _id: string;
  email: string;
  itemName: string;
  moneyAmount: number; // gross (includes VAT if applicable)
  smsAmount?: number | null;
  transactionId: string;
  createdAt: string; // ISO

  // Optional fields we may have in DB
  currency?: string; // e.g. "ILS"
  status?: string; // captured/pending/etc
  provider?: string | null;
  providerMethod?: string | null;
  providerRefs?: Record<string, string> | null;

  // Accounting/documents
  docType?: string | null;
  docStatus?: string | null;
  docProvider?: string | null;
  docId?: string | null;
  docUrl?: string | null;
  docIssuedAt?: string | Date | null;

  feeDocType?: string | null;
  feeDocStatus?: string | null;
  feeDocProvider?: string | null;
  feeDocId?: string | null;
  feeDocUrl?: string | null;
  feeDocIssuedAt?: string | Date | null;

  // Tax snapshot & fee breakdown (optional)
  appliedVatRate?: number | null; // percent, e.g. 18
  taxAmount?: number | null; // output VAT on the main doc (if MoR)
  taxBaseAmount?: number | null; // net base on the main doc (if MoR)

  giftAmount?: number | null;
  platformFeeBase?: number | null;
  platformFeeVat?: number | null;
  platformFeeTotal?: number | null;
};

export type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  payment: PaymentModalPayment | null;
};

// ---------- Helpers ----------
const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

function fmtCurrency(v: number, ccy?: string) {
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: ccy || "ILS",
      maximumFractionDigits: 2,
    }).format(v ?? 0);
  } catch {
    return ils.format(v ?? 0);
  }
}

function parseDateSafe(s?: string | Date | null) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

function fmtDateTime(d?: string | Date | null) {
  const dd = parseDateSafe(d);
  return dd ? dd.toLocaleString("he-IL") : "—";
}

function pct1(v: number) {
  return `${v.toFixed(1)}%`;
}

function computeVatAndNet(p?: PaymentModalPayment | null): {
  vat: number;
  net: number;
  rate: number | null;
} {
  if (!p) return { vat: 0, net: 0, rate: null };

  // 1) If server already provided taxAmount/taxBaseAmount -> use them
  if (typeof p.taxAmount === "number" && p.taxAmount >= 0) {
    const vat = p.taxAmount;
    const net =
      typeof p.taxBaseAmount === "number" && p.taxBaseAmount >= 0
        ? p.taxBaseAmount
        : Math.max(0, (Number(p.moneyAmount) || 0) - vat);
    const rate = net > 0 ? (vat / net) * 100 : (p.appliedVatRate ?? null);
    return { vat, net, rate };
  }

  // 2) If platform fee VAT exists (gift use-case), that's your output VAT
  if (typeof p.platformFeeVat === "number" && p.platformFeeVat >= 0) {
    const vat = p.platformFeeVat;
    // This "net" is only for display; moneyAmount is gross paid by buyer.
    const net = Math.max(0, (Number(p.moneyAmount) || 0) - vat);
    const base =
      typeof p.platformFeeBase === "number"
        ? p.platformFeeBase
        : vat > 0
          ? vat / ((p.appliedVatRate ?? 0) / 100)
          : 0;
    const rate = base > 0 ? (vat / base) * 100 : (p.appliedVatRate ?? null);
    return { vat, net, rate };
  }

  // 3) Derive from appliedVatRate assuming moneyAmount is gross
  if (typeof p.appliedVatRate === "number" && p.appliedVatRate > 0) {
    const r = p.appliedVatRate / 100;
    const gross = Number(p.moneyAmount) || 0;
    const vat = gross * (r / (1 + r));
    const net = gross - vat;
    return { vat, net, rate: p.appliedVatRate };
  }

  // 4) No VAT
  return {
    vat: 0,
    net: Number(p?.moneyAmount || 0),
    rate: p?.appliedVatRate ?? null,
  };
}

// Close on Esc / click outside
function useModalDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export default function PaymentModal({
  open,
  onClose,
  payment,
}: PaymentModalProps) {
  useModalDismiss(open, onClose);
  if (!open || !payment) return null;

  const { vat, net, rate } = computeVatAndNet(payment);
  const gross = Number(payment.moneyAmount) || 0;
  const ccy = payment.currency || "ILS";

  return (
    <div className="fixed inset-0 z-[1000]" aria-modal>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden"
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">פרטי תשלום</h3>
              <span className="text-xs text-gray-500">
                {payment.itemName} · {fmtDateTime(payment.createdAt)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm hover:bg-gray-200"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
            dir="rtl"
          >
            {/* Left column */}
            <div className="space-y-2">
              <Row label="אימייל">{payment.email}</Row>
              <Row label="חבילה/פריט">{payment.itemName}</Row>
              <Row label="מזהה עסקה">{payment.transactionId}</Row>
              <Row label="מטבע">{ccy}</Row>
              <Row label="סטטוס">{statusBadge(payment.status)}</Row>
              <Row label="ספק סליקה">
                {payment.provider || "—"}
                {payment.providerMethod ? ` · ${payment.providerMethod}` : ""}
              </Row>
              {payment.providerRefs &&
                Object.keys(payment.providerRefs).length > 0 && (
                  <Row label="מזהי ספק">
                    <div className="flex flex-col gap-1 max-h-28 overflow-auto">
                      {Object.entries(payment.providerRefs).map(([k, v]) => (
                        <code
                          key={k}
                          className="text-[11px] bg-gray-100 rounded px-1 py-0.5"
                        >
                          {k}: {String(v)}
                        </code>
                      ))}
                    </div>
                  </Row>
                )}
            </div>

            {/* Right column: amounts */}
            <div className="space-y-2">
              <Row label="סכום ברוטו">{fmtCurrency(gross, ccy)}</Row>
              <Row label="ללא מעמ">{fmtCurrency(net, ccy)}</Row>
              <Row label="מעמ">{fmtCurrency(vat, ccy)}</Row>
              <Row label="שיעור מעמ">
                {typeof rate === "number" ? pct1(rate) : "—"}
              </Row>

              {(payment.platformFeeTotal ?? 0) > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="text-xs text-gray-500 mb-1">
                    עמלת פלטפורמה
                  </div>
                  <KV
                    k="בסיס עמלה"
                    v={fmtCurrency(payment.platformFeeBase || 0, ccy)}
                  />
                  <KV
                    k="מעמ על עמלה"
                    v={fmtCurrency(payment.platformFeeVat || 0, ccy)}
                  />
                  <KV
                    k="עמלה כולל מעמ"
                    v={fmtCurrency(payment.platformFeeTotal || 0, ccy)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DocCard
                title="מסמך ראשי"
                docType={payment.docType}
                docStatus={payment.docStatus}
                docProvider={payment.docProvider}
                docId={payment.docId}
                docUrl={payment.docUrl}
                issuedAt={payment.docIssuedAt}
              />
              <DocCard
                title="מסמך עמלה"
                docType={payment.feeDocType}
                docStatus={payment.feeDocStatus}
                docProvider={payment.feeDocProvider}
                docId={payment.feeDocId}
                docUrl={payment.feeDocUrl}
                issuedAt={payment.feeDocIssuedAt}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-[7rem] text-gray-500 text-xs">{label}</div>
      <div className="text-sm break-all">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    captured: "bg-green-100 text-green-700",
    authorized: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-purple-100 text-purple-700",
    chargeback: "bg-orange-100 text-orange-700",
  };
  const cls = map[s] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${cls}`}>
      {status || "—"}
    </span>
  );
}

function DocCard(props: {
  title: string;
  docType?: string | null;
  docStatus?: string | null;
  docProvider?: string | null;
  docId?: string | null;
  docUrl?: string | null;
  issuedAt?: string | Date | null;
}) {
  const { title, docType, docStatus, docProvider, docId, docUrl, issuedAt } =
    props;
  const has = !!(docType || docId || docUrl);
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      {!has ? (
        <div className="text-sm text-gray-500">— אין נתוני מסמך —</div>
      ) : (
        <div className="space-y-1 text-sm">
          <KV k="סוג" v={docType || "—"} />
          <KV k="סטטוס" v={docStatus || "—"} />
          <KV k="ספק" v={docProvider || "—"} />
          <KV
            k="מזהה"
            v={
              <code className="text-[11px] bg-gray-100 rounded px-1 py-0.5">
                {docId || "—"}
              </code>
            }
          />
          <KV k="נוצר בתאריך" v={fmtDateTime(issuedAt)} />
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] underline text-blue-700 mt-1"
            >
              צפייה במסמך ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/*
Usage example:

import PaymentModal, { PaymentModalPayment } from "./PaymentModal";

function Page() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PaymentModalPayment | null>(null);

  return (
    <>
      <button onClick={() => { setSelected(paymentFromRow); setOpen(true); }}>Open</button>
      <PaymentModal open={open} onClose={() => setOpen(false)} payment={selected} />
    </>
  );
}
*/
