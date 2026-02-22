from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from backend.app.saju import Chart, calculate_chart


@dataclass(frozen=True)
class MansaeCase:
    """만세력 앱 결과(4주)와 비교하기 위한 단일 케이스."""

    birth_date: date
    birth_time: Optional[str]
    expected_year: str
    expected_month: str
    expected_day: str
    expected_hour: Optional[str]
    comment: str = ""


def assert_case(case: MansaeCase) -> Chart:
    ch = calculate_chart(case.birth_date, case.birth_time)

    assert ch.year.stem + ch.year.branch == case.expected_year, case.comment
    assert ch.month.stem + ch.month.branch == case.expected_month, case.comment
    assert ch.day.stem + ch.day.branch == case.expected_day, case.comment

    if case.expected_hour is None:
        assert ch.hour is None, case.comment
    else:
        assert ch.hour is not None, case.comment
        assert ch.hour.stem + ch.hour.branch == case.expected_hour, case.comment

    return ch
