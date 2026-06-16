"""Normalización y validación de correos electrónicos.

Funciona en dos fases:
  1. ANÁLISIS: detecta correos que necesitan normalización (mayúsculas/espacios),
     correos genuinamente inválidos (malformados) y colisiones (normalizar crearía
     duplicados que violan la restricción única de usuarios.email).
  2. CORRECCIÓN: tras confirmación del usuario, aplica SOLO las normalizaciones
     seguras. Los inválidos y las colisiones se listan para revisión manual y NO
     se tocan.

Uso:
    python scripts/normalize_emails.py            # analiza y pide confirmación
    python scripts/normalize_emails.py --dry-run  # solo analiza, no cambia nada
    python scripts/normalize_emails.py --yes       # aplica sin preguntar
"""
import argparse
import os
import re
import sys
from collections import Counter

# Añadir el directorio raíz al path para poder importar la aplicación
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.usuario import Usuario
from app.models.invitacion import Invitacion

try:
    from email_validator import validate_email, EmailNotValidError
    HAS_VALIDATOR = True
except ImportError:  # pragma: no cover
    HAS_VALIDATOR = False

_FALLBACK_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalizar(valor: str | None) -> str:
    return (valor or "").strip().lower()


def es_valido(valor: str) -> bool:
    if not valor:
        return False
    if HAS_VALIDATOR:
        try:
            validate_email(valor, check_deliverability=False)
            return True
        except EmailNotValidError:
            return False
    return bool(_FALLBACK_RE.match(valor))


def analizar(registros, unico: bool):
    """Clasifica los registros en: a_corregir, invalidos, colisiones.

    - a_corregir: necesitan normalización, el resultado es válido y (si `unico`)
      no choca con otro registro.
    - invalidos: el correo normalizado sigue siendo malformado -> revisión manual.
    - colisiones: normalizar produciría un duplicado en una columna única.
    """
    a_corregir = []   # (registro, original, normalizado)
    invalidos = []    # (registro, original)
    colisiones = []   # (registro, original, normalizado)

    # Conteo de correos finales (normalizados) para detectar duplicados
    conteo_final = Counter(normalizar(r.email) for r in registros)

    for r in registros:
        original = r.email
        norm = normalizar(original)

        if not es_valido(norm):
            invalidos.append((r, original))
            continue

        if original == norm:
            continue  # ya está correcto

        if unico and conteo_final[norm] > 1:
            colisiones.append((r, original, norm))
            continue

        a_corregir.append((r, original, norm))

    return a_corregir, invalidos, colisiones


def _imprimir_seccion(titulo: str, filas: list[str]) -> None:
    print(f"\n{titulo} ({len(filas)})")
    for fila in filas:
        print(f"   {fila}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalizar y validar correos electrónicos")
    parser.add_argument("--dry-run", action="store_true", help="Solo analizar, sin aplicar cambios")
    parser.add_argument("--yes", action="store_true", help="Aplicar sin pedir confirmación")
    args = parser.parse_args()

    if not HAS_VALIDATOR:
        print("⚠️  email-validator no está instalado; se usará validación básica por regex.")

    db = SessionLocal()
    try:
        usuarios = db.query(Usuario).all()
        invitaciones = db.query(Invitacion).all()

        # usuarios.email es ÚNICO -> comprobar colisiones; invitaciones.email no lo es.
        u_fix, u_inval, u_colis = analizar(usuarios, unico=True)
        i_fix, i_inval, i_colis = analizar(invitaciones, unico=False)

        # ---------- FASE 1: INFORME ----------
        print("=" * 70)
        print("ANÁLISIS DE CORREOS ELECTRÓNICOS")
        print("=" * 70)
        print(f"Usuarios analizados: {len(usuarios)} | Invitaciones analizadas: {len(invitaciones)}")

        if u_fix or i_fix:
            _imprimir_seccion(
                "✏️  Correcciones seguras (se normalizarán)",
                [f"[usuario  #{r.id}] '{o}'  ->  '{n}'" for r, o, n in u_fix]
                + [f"[invitac. #{r.id}] '{o}'  ->  '{n}'" for r, o, n in i_fix],
            )

        if u_colis or i_colis:
            _imprimir_seccion(
                "⚠️  Colisiones (NO se tocan, requieren revisión manual)",
                [f"[usuario  #{r.id}] '{o}'  ->  '{n}'  (ya existe otro con '{n}')" for r, o, n in u_colis]
                + [f"[invitac. #{r.id}] '{o}'  ->  '{n}'" for r, o, n in i_colis],
            )

        if u_inval or i_inval:
            _imprimir_seccion(
                "❌ Correos inválidos (NO se tocan, requieren revisión manual)",
                [f"[usuario  #{r.id}] '{o}'" for r, o in u_inval]
                + [f"[invitac. #{r.id}] '{o}'" for r, o in i_inval],
            )

        total_fix = len(u_fix) + len(i_fix)

        print("\n" + "-" * 70)
        print(f"Resumen: {total_fix} corrección(es) segura(s), "
              f"{len(u_colis) + len(i_colis)} colisión(es), "
              f"{len(u_inval) + len(i_inval)} inválido(s).")

        if total_fix == 0:
            print("\nNo hay correcciones automáticas que aplicar.")
            return 0

        if args.dry_run:
            print("\n(--dry-run) No se ha modificado nada.")
            return 0

        # ---------- FASE 2: CONFIRMACIÓN + CORRECCIÓN ----------
        if not args.yes:
            respuesta = input(f"\n¿Aplicar las {total_fix} correcciones seguras? Escribe 'SI' para confirmar: ")
            if respuesta.strip() != "SI":
                print("Operación cancelada. No se ha modificado nada.")
                return 1

        for registro, _original, norm in (*u_fix, *i_fix):
            registro.email = norm

        db.commit()
        print(f"\n✅ Hecho. {total_fix} correo(s) normalizado(s).")
        if u_colis or i_colis or u_inval or i_inval:
            print("ℹ️  Quedan correos en colisión/inválidos pendientes de revisión manual (ver arriba).")
        return 0

    except Exception as e:
        db.rollback()
        print(f"❌ Error durante el proceso: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
