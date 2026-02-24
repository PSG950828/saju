from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1995_08_28_2301_kst_app_snapshot() -> None:
    """자시(23시) 일주 교체 경계 정합 테스트.

    케이스: 박승근(남) 1995-08-28 (양력, KST) 23:01

    현재 엔진 결과(=스크린샷에서 확인된 값):
      年柱 乙亥 / 月柱 甲申 / 日柱 壬辰 / 時柱 庚子
    """

    case = MansaeCase(
        birth_date=date(1995, 8, 28),
        birth_time="23:01",
        expected_year="乙亥",
        expected_month="甲申",
        expected_day="壬辰",
        expected_hour="庚子",
        comment="박승근(남) 1995-08-28 23:01 (앱 스크린샷)",
    )

    assert_case(case)
