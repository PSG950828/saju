from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_2001_03_06_1420_kst() -> None:
    """스크린샷(루시아 원 만세력 PC) 기준.

    입력: 2001-03-06 (양력, KST) 14:20
    기대(엔진 출력 기반, 스크린샷 교차검증 필요): 年柱 辛巳 / 月柱 辛卯 / 日柱 戊辰 / 時柱 己未

    참고: 이 케이스는 절기 경계 직후 "월주 확정" 구간 검증용.
    """

    case = MansaeCase(
        birth_date=date(2001, 3, 6),
        birth_time="14:20",
        expected_year="辛巳",
        expected_month="辛卯",
        expected_day="戊辰",
        expected_hour="己未",
        comment="이지은(여) 2001-03-06 14:20",
    )

    assert_case(case)
