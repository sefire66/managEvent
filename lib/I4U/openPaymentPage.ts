// lib/I4U/openPaymentPage.ts

/**
 * פותח את עמוד התשלום:
 * עדיפות: redirectUrl > shortUrl > /pay/{token}
 * אם חלון קופץ נחסם — fallback לנווט באותו חלון.
 */
export function openPaymentPage(opts: {
  redirectUrl?: string | null;
  shortUrl?: string | null;
  token?: string | null;
  fallbackPath?: string; // דיפולט: "/pay"
}) {
  const { redirectUrl, shortUrl, token, fallbackPath = "/pay" } = opts;

  const url =
    (redirectUrl && redirectUrl.trim()) ||
    (shortUrl && shortUrl.trim()) ||
    (token ? `${fallbackPath}/${encodeURIComponent(token)}` : "");

  if (!url) return;
  // const win = window.open(url, "_blank", "noopener,noreferrer");
  const win = window.open(url, "_self", "noopener,noreferrer");
  if (!win) {
    window.location.href = url;
  }
}
