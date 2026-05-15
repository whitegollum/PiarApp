"""Generador de nombres creativos para invitados (temática porcina)"""
import random

_ADJETIVOS = [
    "curioso", "valiente", "veloz", "travieso", "brillante", "astuto",
    "alegre", "glotón", "soñoliento", "feroz", "audaz", "pícaro",
    "ágil", "intrépido", "jovial", "listo", "mágico", "noble",
    "osado", "prudente", "radiante", "sagaz", "tenaz", "único",
    "vivaz", "zumbón", "brioso", "cálido", "danzarín", "eléctrico",
    "fulgente", "hambriento", "imparable", "juguetón", "luminoso",
    "majestuoso", "optimista", "rugiente", "simpático", "torpe",
    "ufano", "virtuoso", "acrobático", "bizarro", "centelleante",
    "despistado", "estoico", "frenético", "gordito", "heroico",
]


def generar_nombre_cerdo() -> str:
    adjetivo = random.choice(_ADJETIVOS)
    return f"Cerdo {adjetivo.capitalize()}"
