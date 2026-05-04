"""
Utilidades para validación y normalización de URLs de AliExpress.

MIGRAR a aliexpress.affiliate.link.generate (Open Platform API) cuando se aprueben
las credenciales de desarrollador. La función url_afiliada() encapsula todo el flujo,
así que la migración solo requerirá cambiar su implementación interna.
"""
import re
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

# Hostnames legítimos de AliExpress (subdominio.aliexpress.com)
ALIEXPRESS_HOSTNAME_RE = re.compile(r"^([a-z0-9-]+\.)*aliexpress\.com$", re.IGNORECASE)

# Parámetros de tracking que ensucian las URLs y conviene eliminar al guardar
TRACKING_PARAMS_PREFIXES = ("utm_", "aff_", "algo_", "btsid", "ws_ab_test")
TRACKING_PARAMS_EXACT = {"spm", "pdp_npi", "scm", "scm_id", "scm-url", "pvid", "_t", "gatewayAdapt"}

# Hostname del redirector de afiliados — bloqueado al crear productos para impedir
# que un usuario inyecte SU propio link de afiliado y nos robe la atribución
ALIEXPRESS_AFFILIATE_HOSTNAMES = {"s.click.aliexpress.com"}


def is_aliexpress_url(url: str) -> bool:
    """True si la URL apunta a un dominio aliexpress.com (incluyendo subdominios)."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        return bool(parsed.hostname and ALIEXPRESS_HOSTNAME_RE.match(parsed.hostname))
    except Exception:
        return False


def is_third_party_affiliate(url: str) -> bool:
    """True si la URL es un link de afiliación de terceros (s.click.aliexpress.com)."""
    try:
        parsed = urlparse(url)
        return parsed.hostname in ALIEXPRESS_AFFILIATE_HOSTNAMES
    except Exception:
        return False


def normalize_aliexpress_url(url: str) -> str:
    """
    Limpia parámetros de tracking conservando los que afectan al producto
    (itemId, sku, etc.). Si la URL no es de AliExpress, la devuelve intacta.
    """
    if not is_aliexpress_url(url):
        return url
    parsed = urlparse(url)
    clean_qs = [
        (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=False)
        if not k.lower().startswith(TRACKING_PARAMS_PREFIXES)
        and k.lower() not in TRACKING_PARAMS_EXACT
    ]
    return urlunparse(parsed._replace(query=urlencode(clean_qs)))
