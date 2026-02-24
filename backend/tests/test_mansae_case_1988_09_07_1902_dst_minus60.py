from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1988_09_07_1902_kst_app_snapshot_until_dst_supported() -> None:
    """절기 경계(백로) 직전 - 기준 앱 결과 스냅샷.

    스크린샷에는 "서머타임 -60분" 표기가 있어, 엄밀히는 DST를 고려한 로컬시각일 수 있습니다.
    현재 엔진은 기본 KST 고정이므로, 우선은 'KST로 입력'한 결과를 스냅샷으로 고정합니다.

    케이스: 백지영(여) 1988-09-07 19:02
    현재 엔진(KST 고정) 결과: 年 戊辰 / 月 庚申 / 日 乙丑 / 時 丙戌
    """

    case = MansaeCase(
        birth_date=date(1988, 9, 7),
        birth_time="19:02",
        expected_year="戊辰",
        expected_month="庚申",
        expected_day="乙丑",
        expected_hour="丙戌",
        comment="백지영(여) 1988-09-07 19:02 (스크린샷: 서머타임 -60분 표기)",
    )

    assert_case(case)
