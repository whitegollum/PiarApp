"""
Redirector de afiliación AliExpress — SOLUCIÓN TEMPORAL.

Establece la cookie de afiliación abriendo un banner en pestaña nueva
y redirigiendo la pestaña actual al producto. Atribución imperfecta:
Safari iOS (ITP) y Firefox limitan la persistencia de la cookie.
Tasa esperada: ~50-70% Chrome desktop, ~30% Android, <10% iOS.

MIGRAR a aliexpress.affiliate.link.generate (Open Platform API) en
cuanto se aprueben las credenciales de desarrollador.
"""
import json
import logging
from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse, PlainTextResponse

from app.config import settings
from app.utils.aliexpress import is_aliexpress_url

router = APIRouter(tags=["afiliacion"])
logger = logging.getLogger(__name__)

_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Abriendo producto…</title>
  <style>
    body{{font-family:system-ui,-apple-system,sans-serif;display:flex;
         flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;margin:0;background:#fafafa;padding:20px;text-align:center}}
    .card{{background:#fff;padding:32px 28px;border-radius:14px;
          box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:380px;width:100%}}
    h1{{font-size:18px;margin:0 0 8px;color:#222}}
    p{{color:#666;font-size:14px;margin:0 0 20px;line-height:1.5}}
    button{{background:#FF6B35;color:#fff;border:0;padding:14px 32px;
           border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;width:100%}}
    button:disabled{{background:#ccc;cursor:default}}
    button:active:not(:disabled){{transform:scale(.98)}}
    .muted{{font-size:12px;color:#999;margin-top:14px;min-height:16px}}
  </style>
</head>
<body>
  <div class="card">
    <h1>Abriendo producto en AliExpress</h1>
    <p>Pulsa para continuar. Se abrirán dos pestañas: una con el producto y otra que puedes cerrar.</p>
    <button id="go">Abrir producto</button>
    <div class="muted" id="status"></div>
  </div>
<script>
(() => {{
  const PRODUCT_URL = {product_url_json};
  const BANNER = {banner_url_json};
  const btn = document.getElementById('go');
  const status = document.getElementById('status');
  let lanzado = false;

  function lanzar() {{
    if (lanzado) return;
    lanzado = true;
    btn.disabled = true;
    status.textContent = 'Cargando…';
    const aff = window.open(BANNER, '_blank');
    setTimeout(() => {{
      if (aff) {{ try {{ aff.close(); }} catch(e) {{}} }}
      window.location.href = PRODUCT_URL;
    }}, 1200);
  }}

  btn.addEventListener('click', lanzar);
  // Auto-disparo: funciona en Chrome desktop sin bloqueador.
  // En móvil falla silenciosamente y el botón actúa como fallback.
  window.addEventListener('load', () => {{
    setTimeout(() => {{ try {{ lanzar(); }} catch(e) {{}} }}, 80);
  }});
}})();
</script>
</body>
</html>
"""


@router.get("/go", response_class=HTMLResponse, include_in_schema=False)
async def go(
    request: Request,
    to: str = Query(..., description="URL del producto de AliExpress"),
):
    """
    Página intermedia que asienta la cookie de afiliación y redirige al producto.
    Endpoint público (no requiere auth) — los links se comparten entre socios.
    """
    if not settings.aliexpress_redirect_enabled:
        # Bypass directo si la feature está desactivada
        return HTMLResponse(
            f'<meta http-equiv="refresh" content="0;url={to}">',
            status_code=200,
        )

    if not is_aliexpress_url(to):
        # No convertir el endpoint en open-redirect: solo aliexpress.com permitido
        logger.warning(
            "afiliacion.go rechazado: url no válida",
            extra={"to": to[:200], "ip": request.client.host if request.client else None},
        )
        return PlainTextResponse("URL de destino no permitida.", status_code=400)

    # Logging anónimo (solo plataforma, sin URL completa) para correlacionar con Portals
    ua = request.headers.get("user-agent", "")[:120]
    logger.info(
        "afiliacion.go redirect",
        extra={"hostname": to.split("/")[2] if "/" in to else "?", "ua": ua},
    )

    html = _HTML_TEMPLATE.format(
        product_url_json=json.dumps(to).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"),
        banner_url_json=json.dumps(settings.aliexpress_banner_url).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"),
    )
    response = HTMLResponse(content=html, status_code=200)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response
