from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1993_02_04_2340_kst_snapshot_until_app_confirmed() -> None:
    """자시(23시) 경계 검증용 케이스.

    입력: 1993-02-04 (양력, KST) 23:40

    아직 '기준 만세력 앱'의 결과 스크린샷이 없어서, 일단 현재 엔진 출력을 스냅샷으로 고정합니다.
    사용자가 앱 결과(4주)를 주면 expected_*를 그 값으로 업데이트해서 진짜 회귀 테스트로 전환하면 됩니다.

    현재 엔진 기대: 年柱 癸酉 / 月柱 甲寅 / 日柱 丁巳 / 時柱 庚子
    """

    case = MansaeCase(
        birth_date=date(1993, 2, 4),
        birth_time="23:40",
        expected_year="癸酉",
        expected_month="甲寅",
        expected_day="丁巳",
        expected_hour="庚子",
        comment="박준호(남) 1993-02-04 23:40 (엔진 스냅샷)",
    )

    assert_case(case)
