"""Tests de integración para el endpoint de redirección de afiliación."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_go_rechaza_url_no_aliexpress(client):
    r = client.get("/go?to=https://malicioso.com")
    assert r.status_code == 400


def test_go_acepta_url_aliexpress_valida(client):
    r = client.get("/go?to=https://www.aliexpress.com/item/123.html")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    assert "s.click.aliexpress.com" in r.text  # banner inyectado
    assert "aliexpress.com/item/123.html" in r.text  # producto inyectado


def test_go_escapa_xss_en_query(client):
    payload = 'https://www.aliexpress.com/"><script>alert(1)</script>'
    r = client.get(f"/go?to={payload}")
    # debe rechazarse o renderizarse escapado, nunca como script ejecutable
    assert "<script>alert(1)" not in r.text


def test_go_sin_parametro_to(client):
    r = client.get("/go")
    assert r.status_code == 422  # FastAPI validation error


def test_go_redirect_disabled(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "aliexpress_redirect_enabled", False)
    r = client.get("/go?to=https://www.aliexpress.com/item/123.html")
    assert r.status_code == 200
    assert "meta http-equiv" in r.text
