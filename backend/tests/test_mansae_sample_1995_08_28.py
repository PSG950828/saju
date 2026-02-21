from datetime import date

from backend.app.saju import calculate_chart


def test_mansae_sample_1995_08_28_0530_kst() -> None:
    """첨부 만세력 스크린샷 기준 샘플 검증.

    입력: 1995-08-28 05:30 (KST, 양력)
    기대: 年柱 乙亥 / 月柱 甲申 / 日柱 辛卯 / 時柱 辛卯
    """

    ch = calculate_chart(date(1995, 8, 28), "05:30")
    assert ch.year.stem + ch.year.branch == "乙亥"
    assert ch.month.stem + ch.month.branch == "甲申"
    assert ch.day.stem + ch.day.branch == "辛卯"
    assert ch.hour is not None
    assert ch.hour.stem + ch.hour.branch == "辛卯"
