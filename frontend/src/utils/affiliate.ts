/**
 * Genera la URL que debe usarse en los enlaces de productos comunitarios.
 *
 * Para productos de AliExpress, envuelve la URL en el redirector del backend
 * (/go?to=...) que asienta la cookie de afiliación antes de redirigir.
 * Para otras plataformas (Amazon, etc.), devuelve la URL intacta.
 *
 * MIGRAR a aliexpress.affiliate.link.generate (Open Platform API) cuando esté
 * aprobada: el cambio será solo en este archivo (consumir un campo
 * url_afiliada precalculado en el backend, en lugar de construir /go?to=).
 */

const ALIEXPRESS_HOSTNAME_RE = /^([a-z0-9-]+\.)*aliexpress\.com$/i;

// En desarrollo el backend está en :8000, en producción está en el mismo origen
const REDIRECT_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ?? "";

export function isAliexpressUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    return ALIEXPRESS_HOSTNAME_RE.test(u.hostname);
  } catch {
    return false;
  }
}

export function affiliateUrl(productUrl: string | null | undefined): string {
  if (!productUrl) return "#";
  if (!isAliexpressUrl(productUrl)) return productUrl;
  return `${REDIRECT_BASE}/go?to=${encodeURIComponent(productUrl)}`;
}
