from __future__ import annotations

from datetime import date

import pytest

from app.saju import analyze


def test_timezone_fallback_adds_accuracy_note_warning():
    # Asia/Seoul 이외 timezone은 KST로 폴백하고 경고를 남겨야 합니다.
    result = analyze(date(1990, 5, 17), "09:30", timezone="UTC")
    assert result.accuracy_note
    assert "KST(Asia/Seoul)" in result.accuracy_note


def test_solar_terms_unavailable_falls_back_and_warns(monkeypatch: pytest.MonkeyPatch):
    # 절기 엔진이 실패해도 서버는 살아있고, 월주 계산은 간이 규칙으로 폴백되며
    # accuracy_note로 사용자에게 경고해야 합니다.
    from app import saju as saju_module

    def _boom(*args, **kwargs):
        raise RuntimeError("solar terms down")

    monkeypatch.setattr(saju_module, "find_junggi_crossings_for_kst_date", _boom)

    result = analyze(date(1990, 5, 17), "09:30")
    assert result.chart.month.stem
    assert result.chart.month.branch
    assert result.accuracy_note
    assert "폴백" in result.accuracy_note
