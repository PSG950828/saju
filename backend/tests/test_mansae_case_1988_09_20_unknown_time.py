from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1988_09_20_unknown_time_kst() -> None:
    """스크린샷(루시아 원 만세력 PC) 기준.

    입력: 1988-09-20 (양력, KST) / 시간 미상
    기대: 年柱 戊辰 / 月柱 辛酉 / 日柱 戊寅 / 時柱 없음
    """

    case = MansaeCase(
        birth_date=date(1988, 9, 20),
        birth_time=None,
        expected_year="戊辰",
        expected_month="辛酉",
        expected_day="戊寅",
        expected_hour=None,
        comment="김수진(여) 1988-09-20 시간 미상",
    )

    assert_case(case)
