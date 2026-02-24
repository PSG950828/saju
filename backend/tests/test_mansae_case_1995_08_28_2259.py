from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1995_08_28_2259_kst_app_snapshot() -> None:
    """기준 만세력 앱(스크린샷)과 정합 테스트.

    케이스: 박승근(남) 1995-08-28 (양력, KST) 22:59

    현재 엔진 결과(=스크린샷에서 확인된 값):
      年柱 乙亥 / 月柱 甲申 / 日柱 辛卯 / 時柱 己亥
    """

    case = MansaeCase(
        birth_date=date(1995, 8, 28),
        birth_time="22:59",
        expected_year="乙亥",
        expected_month="甲申",
        expected_day="辛卯",
        expected_hour="己亥",
        comment="박승근(남) 1995-08-28 22:59 (앱 스크린샷)",
    )

    assert_case(case)
