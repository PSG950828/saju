from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1995_05_15_1130_kst() -> None:
    """스크린샷(루시아 원 만세력 PC) 기준.

    입력: 1995-05-15 (양력, KST) 11:30
    기대(엔진 출력 기반, 스크린샷 교차검증 필요): 年柱 乙亥 / 月柱 辛巳 / 日柱 丙午 / 時柱 甲午

    참고: "일반(비경계)" 기준점 케이스.

    주의: 사용자가 텍스트로는 1999-05-15를 주셨지만, 첨부 스크린샷 입력은 1995-05-15로 보입니다.
    일단 스크린샷 값을 우선 고정합니다.
    """

    case = MansaeCase(
        birth_date=date(1995, 5, 15),
        birth_time="11:30",
        expected_year="乙亥",
        expected_month="辛巳",
        expected_day="丙午",
        expected_hour="甲午",
        comment="김태훈(남) 1995-05-15 11:30",
    )

    assert_case(case)
