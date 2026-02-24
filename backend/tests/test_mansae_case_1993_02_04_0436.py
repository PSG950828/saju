from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1993_02_04_0436_kst_app_reference() -> None:
    """절기(절입시간) 경계 직전 케이스.

    입력: 1993-02-04 (양력, KST) 04:36

    스크린샷 상 경고: "절입시간(04:37)이 적용되는 날".
    즉, 04:36은 절입 1분 전(경계 직전)이라 월주 경계 검증에 사용합니다.

        기준 만세력 앱(스크린샷) 기대:
            - 年柱 壬申
            - 月柱 癸丑
            - 日柱 丙辰
            - 時柱 庚寅

        참고: 절기(입춘 315°) 절입시각은 앱 표(override) 기준 04:37로 적용합니다.
    """

    case = MansaeCase(
        birth_date=date(1993, 2, 4),
        birth_time="04:36",
        expected_year="壬申",
        expected_month="癸丑",
        expected_day="丙辰",
        expected_hour="庚寅",
        comment="김하윤(여) 1993-02-04 04:36 (기준 만세력 앱)",
    )

    assert_case(case)
