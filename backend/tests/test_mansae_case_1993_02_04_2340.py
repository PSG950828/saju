from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1993_02_04_2340_kst_snapshot_until_app_confirmed() -> None:
    """자시(23시) 경계 검증용 케이스.

    입력: 1993-02-04 (양력, KST) 23:40

    기준 만세력 앱(스크린샷) 결과를 기대값으로 고정해 회귀를 방지합니다.

    기준 앱 기대: 年柱 癸酉 / 月柱 甲寅 / 日柱 丁巳 / 時柱 庚子
    """

    case = MansaeCase(
        birth_date=date(1993, 2, 4),
        birth_time="23:40",
        expected_year="癸酉",
        expected_month="甲寅",
        expected_day="丁巳",
        expected_hour="庚子",
        comment="박준호(남) 1993-02-04 23:40 (기준 만세력 앱)",
    )

    assert_case(case)
