from datetime import date

from app.saju import build_original_result


def test_build_original_with_unknown_time():
    result = build_original_result(date(1995, 8, 28), None, "홍길동")
    assert result.title == "四柱八字"
    assert "時柱: 未詳" in result.raw_text
    assert result.pillars["hour"] is None


def test_build_original_with_time():
    result = build_original_result(date(1995, 8, 28), "07:30", "홍길동")
    assert result.pillars["hour"] is not None
    assert "出生時間:" in result.raw_text
