from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1985_12_21_unknown_time_kst() -> None:
    """스크린샷(루시아 원 만세력 PC) 기준.

    입력: 1985-12-21 (양력, KST) / 시간 미상
    기대(엔진 출력 기반, 스크린샷 교차검증 필요): 年柱 乙丑 / 月柱 戊子 / 日柱 甲午 / 時柱 없음

    참고: 동지(冬至) 부근 + 시간미상 정책 C 검증용.
    """

    case = MansaeCase(
        birth_date=date(1985, 12, 21),
        birth_time=None,
        expected_year="乙丑",
        expected_month="戊子",
        expected_day="甲午",
        expected_hour=None,
        comment="정혜진(여) 1985-12-21 시간 미상",
    )

    assert_case(case)
