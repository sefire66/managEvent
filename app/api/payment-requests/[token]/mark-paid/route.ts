// app/api/payment-requests/[token]/mark-paid/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import Payment from "@/models/Payment";
import User from "@/models/User";
import {
  createReceipt,
  createTaxInvoice,
  sendDocumentByMail,
} from "@/lib/invoice4u";

// עיגול לשתי ספרות (כספים)
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    await connectToDatabase();
    const { token } = await ctx.params;

    const body = await req.json().catch(() => ({}) as any);
    const {
      provider, // "invoice4u" | "paypal" | "cardcom" | "manual" | ...
      providerMethod, // "credit_card" | "paypal_balance" | "bank_transfer" | ...
      providerRefs, // מזהים חיצוניים אופציונליים: { order_id, capture_id, ... }
      transactionId, // מזהה טרנזקציה חיצוני (חובה)
      currency, // מטבע ששולם בפועל (חובה לאימות מול ה-PR)

      // פרטי משלם (אם יש)
      payerName,
      payerEmail,
      payerPhone,

      // מזהה לקוח I4U אופציונלי
      clientId,

      // סכומים:
      paidAmount, // סה״כ ששולם בפועל (ברוטו) – חובה

      // gift בלבד:
      giftAmount, // סכום המתנה נטו (G) – אם חסר בפתוח נגזור מהברוטו
    } = body || {};

    // ולידציות בסיסיות
    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }
    if (typeof paidAmount !== "number" || !(paidAmount > 0)) {
      return NextResponse.json(
        { error: "paidAmount must be a positive number" },
        { status: 400 }
      );
    }

    // ---- Idempotency ----
    const existing = provider
      ? await Payment.findOne({ provider, transactionId }).lean()
      : await Payment.findOne({ transactionId }).lean();
    if (existing) {
      return NextResponse.json({
        ok: true,
        paymentId: String(existing._id),
        requestId: existing.requestId ? String(existing.requestId) : "",
        deduped: true,
      });
    }

    // --- שליפת ה-PR ---
    const pr = await PaymentRequest.findOne({ token });
    if (!pr) {
      return NextResponse.json(
        { error: "PaymentRequest not found" },
        { status: 404 }
      );
    }

    // אימות מטבע
    const prCurrency = (pr.currency || "ILS").toUpperCase();
    if (!currency || String(currency).toUpperCase().trim() !== prCurrency) {
      return NextResponse.json(
        {
          error: `Currency mismatch: PR=${prCurrency}, paid=${currency ?? "N/A"}`,
        },
        { status: 400 }
      );
    }

    // סטטוס/תוקף/מכסה
    if (pr.status !== "active") {
      return NextResponse.json(
        { error: "PaymentRequest is not active" },
        { status: 400 }
      );
    }
    const now = new Date();
    if (pr.expiresAt && pr.expiresAt < now) {
      return NextResponse.json(
        { error: "PaymentRequest expired" },
        { status: 400 }
      );
    }
    if (typeof pr.usageLimit === "number" && pr.uses >= pr.usageLimit) {
      return NextResponse.json(
        { error: "Usage limit reached" },
        { status: 400 }
      );
    }

    // Owner Email
    const owner = pr.ownerUserId
      ? await User.findById(pr.ownerUserId)
          .select("email")
          .lean<{ email?: string }>()
      : null;
    const ownerEmail: string | null = owner?.email ?? null;

    // מע״מ ועמלות
    const isExempt = String((pr as any).businessType) === "EXEMPT";
    const rawVatRatePct = typeof pr.vatRate === "number" ? pr.vatRate : 0; // אחוזים
    const vatRatePct = isExempt ? 0 : rawVatRatePct;
    const vat = vatRatePct > 1 ? vatRatePct / 100 : vatRatePct; // 0..1

    const feePercentPct = typeof pr.feePercent === "number" ? pr.feePercent : 0;
    const feePct = feePercentPct > 1 ? feePercentPct / 100 : feePercentPct;
    const feeFixed = typeof pr.feeFixed === "number" ? pr.feeFixed : 0;

    // סכומים
    let finalGiftAmount: number | null = null;
    let feeBase: number | null = null;
    let feeVat: number | null = null;
    let feeTotal: number | null = null;

    if (pr.type === "payment") {
      if (typeof pr.amount !== "number" || !(pr.amount > 0)) {
        return NextResponse.json(
          { error: "Invalid PaymentRequest.amount" },
          { status: 400 }
        );
      }
      const diff = Math.abs(round2(paidAmount) - round2(pr.amount));
      if (diff > 0.01) {
        return NextResponse.json(
          {
            error: `paidAmount (${paidAmount}) != request amount (${pr.amount})`,
          },
          { status: 400 }
        );
      }
    } else if (pr.type === "gift") {
      if (typeof giftAmount === "number" && giftAmount >= 1) {
        finalGiftAmount = round2(giftAmount);
      } else if (typeof pr.amount === "number" && pr.amount >= 1) {
        finalGiftAmount = round2(pr.amount);
      } else {
        if (pr.feeMode === "add_on" || !pr.feeMode) {
          // paid = g + (fixed + g*feePct) * (1+vat)
          // => g = (paid - fixed*(1+vat)) / (1 + feePct*(1+vat))
          const denom = 1 + feePct * (1 + vat);
          const numer = paidAmount - feeFixed * (1 + vat);
          finalGiftAmount = round2(numer / denom);
        } else {
          finalGiftAmount = round2(paidAmount);
        }
      }

      if (!(finalGiftAmount >= 1)) {
        return NextResponse.json(
          { error: "giftAmount must be >= 1" },
          { status: 400 }
        );
      }

      feeBase = round2(feeFixed + finalGiftAmount * feePct);
      feeVat = round2(feeBase * vat);
      feeTotal = round2(feeBase + feeVat);

      if (pr.feeMode === "add_on" || !pr.feeMode) {
        const expectedPaid = round2(finalGiftAmount + (feeTotal || 0));
        const diff = Math.abs(round2(paidAmount) - expectedPaid);
        if (diff > 0.01) {
          return NextResponse.json(
            {
              error: `paidAmount (${paidAmount}) != expected (gift ${finalGiftAmount} + fee ${feeTotal} = ${expectedPaid})`,
            },
            { status: 400 }
          );
        }
      } else {
        const expectedPaid = round2(finalGiftAmount);
        const diff = Math.abs(round2(paidAmount) - expectedPaid);
        if (diff > 0.01) {
          return NextResponse.json(
            {
              error: `paidAmount (${paidAmount}) != expected gift amount (${expectedPaid}) for included fee`,
            },
            { status: 400 }
          );
        }
      }
    }

    // יצירת רשומת Payment
    const payment = await Payment.create({
      email: ownerEmail,

      itemName: pr.title,
      moneyAmount: round2(paidAmount),
      transactionId,

      requestId: pr._id,
      eventId: pr.eventId || null,
      ownerUserId: pr.ownerUserId || null,

      provider: provider || null,
      providerMethod: providerMethod || null,
      providerRefs: providerRefs || undefined,
      status: "captured",
      currency: prCurrency,

      payerName,
      payerEmail,
      payerPhone,

      giftAmount: finalGiftAmount ?? null,
      platformFeeBase: feeBase ?? null,
      platformFeeVat: feeVat ?? null,
      platformFeeTotal: feeTotal ?? null,

      appliedVatRate: vatRatePct,
    });

    // הנפקת מסמכים דרך Invoice4U (REST)
    try {
      if (pr.type === "payment") {
        if (isExempt) {
          const rcpt = await createReceipt({
            amount: round2(paidAmount),
            currency: prCurrency,
            itemName: pr.title || "תשלום",
            buyerName: payerName ?? undefined,
            buyerEmail: payerEmail ?? undefined,
            notes: "EXEMPT: receipt only",
            externalTransactionId: transactionId,
            provider: provider ?? null,
            providerMethod: providerMethod ?? null,
            paymentTypeOverride: provider === "paypal" ? 4 : undefined,
            clientId:
              typeof clientId === "number" && clientId > 0
                ? clientId
                : undefined,
          });

          payment.docProvider = "invoice4u";
          payment.docType = "RECEIPT" as any;
          payment.docStatus = "ISSUED" as any;
          payment.docId = rcpt.docId;
          payment.docUrl = rcpt.docUrl;
          payment.docIssuedAt = new Date();

          if (payerEmail) {
            try {
              await sendDocumentByMail({
                docId: String(rcpt.docId),
                to: [payerEmail],
              });
            } catch (e) {
              console.error("I4U send receipt mail failed:", e);
            }
          }
        } else {
          const inv = await createTaxInvoice({
            amount: round2(paidAmount),
            currency: prCurrency,
            itemName: pr.title || "תשלום",
            buyerName: payerName ?? undefined,
            buyerEmail: payerEmail ?? undefined,
            docType: "InvoiceReceipt",
            vatRate: vatRatePct,
            externalTransactionId: transactionId,
            provider: provider ?? null,
            providerMethod: providerMethod ?? null,
            paymentTypeOverride: provider === "paypal" ? 4 : undefined,
            clientId:
              typeof clientId === "number" && clientId > 0
                ? clientId
                : undefined,
          });

          payment.docProvider = "invoice4u";
          payment.docType = "TAX_INVOICE_RECEIPT" as any;
          payment.docStatus = "ISSUED" as any;
          payment.docId = inv.docId;
          payment.docUrl = inv.docUrl;
          payment.docIssuedAt = new Date();

          if (payerEmail) {
            try {
              await sendDocumentByMail({
                docId: String(inv.docId),
                to: [payerEmail],
              });
            } catch (e) {
              console.error("I4U send inv-receipt mail failed:", e);
            }
          }
        }
      } else if (pr.type === "gift") {
        const rcpt = await createReceipt({
          amount: round2(finalGiftAmount!),
          currency: prCurrency,
          itemName: pr.title || "מתנה",
          buyerName: payerName ?? undefined,
          buyerEmail: payerEmail ?? undefined,
          notes: "GIFT",
          externalTransactionId: transactionId,
          provider: provider ?? null,
          providerMethod: providerMethod ?? null,
          paymentTypeOverride: provider === "paypal" ? 4 : undefined,
          clientId:
            typeof clientId === "number" && clientId > 0 ? clientId : undefined,
        });

        payment.docProvider = "invoice4u";
        payment.docType = "RECEIPT" as any;
        payment.docStatus = "ISSUED" as any;
        payment.docId = rcpt.docId;
        payment.docUrl = rcpt.docUrl;
        payment.docIssuedAt = new Date();

        if (payerEmail) {
          try {
            await sendDocumentByMail({
              docId: String(rcpt.docId),
              to: [payerEmail],
            });
          } catch (e) {
            console.error("I4U send gift receipt mail failed:", e);
          }
        }

        if (
          !isExempt &&
          (pr.feeMode === "add_on" || !pr.feeMode) &&
          feeTotal &&
          feeTotal > 0
        ) {
          const invFee = await createTaxInvoice({
            amount: round2(feeTotal),
            currency: prCurrency,
            itemName: `עמלת פלטפורמה – ${pr.title || "אירוע"}`,
            buyerName: payerName ?? undefined,
            buyerEmail: payerEmail ?? undefined,
            vatRate: vatRatePct,
            externalTransactionId: transactionId,
            provider: provider ?? null,
            providerMethod: providerMethod ?? null,
            paymentTypeOverride: provider === "paypal" ? 4 : undefined,
            clientId:
              typeof clientId === "number" && clientId > 0
                ? clientId
                : undefined,
          });

          payment.feeDocProvider = "invoice4u";
          payment.feeDocType = "TAX_INVOICE" as any;
          payment.feeDocStatus = "ISSUED" as any;
          payment.feeDocId = invFee.docId;
          payment.feeDocUrl = invFee.docUrl;
          payment.feeDocIssuedAt = new Date();

          if (payment.feeDocId && payerEmail) {
            try {
              await sendDocumentByMail({
                docId: String(payment.feeDocId),
                to: [payerEmail],
              });
            } catch (e) {
              console.error("I4U send fee invoice mail failed:", e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Invoice issuing failed:", e);
    }

    await payment.save();

    // עדכון uses
    const query: any = {
      _id: pr._id,
      status: "active",
    };
    if (pr.expiresAt) query.expiresAt = { $gt: now };
    if (typeof pr.usageLimit === "number") query.uses = { $lt: pr.usageLimit };

    const newUses = (pr.uses ?? 0) + 1;
    const update: any = { $inc: { uses: 1 } };

    if (typeof pr.usageLimit === "number") {
      update.$set = {
        status: newUses >= pr.usageLimit ? "paid" : "active",
      };
    }

    const updated = await PaymentRequest.findOneAndUpdate(query, update, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json(
        {
          ok: true,
          warning:
            "Payment saved, but PaymentRequest was not updated (possibly expired/limit reached concurrently).",
          paymentId: String(payment._id),
          requestId: String(pr._id),
          payment: {
            moneyAmount: payment.moneyAmount,
            currency: payment.currency,
            transactionId: payment.transactionId,
            provider: payment.provider,
            providerMethod: payment.providerMethod,
            providerRefs: payment.providerRefs || null,
            giftAmount: payment.giftAmount ?? null,
            platformFeeTotal: payment.platformFeeTotal ?? null,
            doc: payment.docId
              ? {
                  provider: payment.docProvider,
                  type: payment.docType,
                  status: payment.docStatus,
                  id: payment.docId,
                  url: payment.docUrl,
                  issuedAt: payment.docIssuedAt,
                }
              : null,
            feeDoc: payment.feeDocId
              ? {
                  provider: payment.feeDocProvider,
                  type: payment.feeDocType,
                  status: payment.feeDocStatus,
                  id: payment.feeDocId,
                  url: payment.feeDocUrl,
                  issuedAt: payment.feeDocIssuedAt,
                }
              : null,
          },
          request: {
            status: pr.status,
            uses: pr.uses,
            usageLimit: pr.usageLimit,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      paymentId: String(payment._id),
      requestId: String(updated._id),
      payment: {
        moneyAmount: payment.moneyAmount,
        currency: payment.currency,
        transactionId: payment.transactionId,
        provider: payment.provider,
        providerMethod: payment.providerMethod,
        providerRefs: payment.providerRefs || null,
        giftAmount: payment.giftAmount ?? null,
        platformFeeTotal: payment.platformFeeTotal ?? null,
        doc: payment.docId
          ? {
              provider: payment.docProvider,
              type: payment.docType,
              status: payment.docStatus,
              id: payment.docId,
              url: payment.docUrl,
              issuedAt: payment.docIssuedAt,
            }
          : null,
        feeDoc: payment.feeDocId
          ? {
              provider: payment.feeDocProvider,
              type: payment.feeDocType,
              status: payment.feeDocStatus,
              id: payment.feeDocId,
              url: payment.feeDocUrl,
              issuedAt: payment.feeDocIssuedAt,
            }
          : null,
      },
      request: {
        status: updated.status,
        uses: updated.uses,
        usageLimit: updated.usageLimit,
      },
    });
  } catch (err: any) {
    console.error("POST /api/payment-requests/[token]/mark-paid error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
