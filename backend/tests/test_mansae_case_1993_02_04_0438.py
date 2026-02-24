from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1993_02_04_0438_kst_app_reference() -> None:
    """절기(절입시간) 경계 직후 케이스.

    입력: 1993-02-04 (양력, KST) 04:38

    04:36 케이스와 함께 '절입시간(입춘) 경계'의 전후를 고정해
    월주/연주 경계 규칙을 기준 만세력 앱과 일치시키기 위한 회귀 테스트입니다.

    기준 만세력 앱(스크린샷) 기대:
      - 年柱 癸酉
      - 月柱 甲寅
      - 日柱 丙辰
      - 時柱 庚寅
    """

    case = MansaeCase(
        birth_date=date(1993, 2, 4),
        birth_time="04:38",
        expected_year="癸酉",
        expected_month="甲寅",
        expected_day="丙辰",
        expected_hour="庚寅",
        comment="김하윤(여) 1993-02-04 04:38 (기준 만세력 앱)",
    )

    assert_case(case)
