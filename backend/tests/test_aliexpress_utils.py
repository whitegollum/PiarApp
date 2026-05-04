"""Tests para utilidades de validación de URLs de AliExpress."""
from app.utils.aliexpress import is_aliexpress_url, is_third_party_affiliate, normalize_aliexpress_url


def test_is_aliexpress_url_validas():
    assert is_aliexpress_url("https://www.aliexpress.com/item/123.html")
    assert is_aliexpress_url("https://es.aliexpress.com/item/123.html")
    assert is_aliexpress_url("https://a.aliexpress.com/_xxx")
    assert is_aliexpress_url("http://aliexpress.com/item/456.html")


def test_is_aliexpress_url_invalidas():
    assert not is_aliexpress_url("https://malicioso.com/aliexpress.com")
    assert not is_aliexpress_url("javascript:alert(1)")
    assert not is_aliexpress_url("")
    assert not is_aliexpress_url("ftp://aliexpress.com/item/1.html")
    assert not is_aliexpress_url("https://aliexpress.com.evil.com/x")


def test_is_third_party_affiliate():
    assert is_third_party_affiliate("https://s.click.aliexpress.com/e/_oFVB2sT")
    assert not is_third_party_affiliate("https://www.aliexpress.com/item/123.html")
    assert not is_third_party_affiliate("")


def test_normalize_strips_tracking():
    raw = "https://www.aliexpress.com/item/123.html?spm=abc&utm_source=x&sku_id=42"
    assert normalize_aliexpress_url(raw) == "https://www.aliexpress.com/item/123.html?sku_id=42"


def test_normalize_preserves_non_tracking_params():
    url = "https://www.aliexpress.com/item/123.html?sku_id=42&color=red"
    assert normalize_aliexpress_url(url) == url


def test_normalize_non_aliexpress_unchanged():
    url = "https://amazon.com/dp/B123?utm_source=x"
    assert normalize_aliexpress_url(url) == url
