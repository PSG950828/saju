from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1997_07_07_0910_kst() -> None:
    """스크린샷(루시아 원 만세력 PC) 기준.

    입력: 1997-07-07 (양력, KST) 09:10
    기대(엔진 출력 기반, 스크린샷 교차검증 필요): 年柱 丁丑 / 月柱 丙午 / 日柱 庚戌 / 時柱 辛巳

    참고: 소서(小暑) 부근 월주 변경 검증용.
    """

    case = MansaeCase(
        birth_date=date(1997, 7, 7),
        birth_time="09:10",
        expected_year="丁丑",
        expected_month="丙午",
        expected_day="庚戌",
        expected_hour="辛巳",
        comment="최민수(남) 1997-07-07 09:10",
    )

    assert_case(case)
