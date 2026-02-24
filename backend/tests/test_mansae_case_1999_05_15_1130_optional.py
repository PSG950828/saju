from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_mansae_case_1999_05_15_1130_kst_engine_snapshot_optional() -> None:
    """사용자 텍스트로 전달된 '1999-05-15 11:30' 케이스(스크린샷 미제공).

    첨부에는 1995-05-15(김태훈) 스크린샷이 있었고, 텍스트에는 1999-05-15가 있어
    혼선을 줄이기 위해 이 파일은 '옵션 스냅샷'으로 별도 유지합니다.

    사용자가 1999-05-15의 기준 앱 결과를 주면 이 테스트를 그 값으로 업데이트하고,
    반대로 불필요하면 삭제해도 됩니다.

    현재 엔진 기대: 年柱 己卯 / 月柱 己巳 / 日柱 丁卯 / 時柱 丙午
    """

    case = MansaeCase(
        birth_date=date(1999, 5, 15),
        birth_time="11:30",
        expected_year="己卯",
        expected_month="己巳",
        expected_day="丁卯",
        expected_hour="丙午",
        comment="(옵션) 1999-05-15 11:30 엔진 스냅샷",
    )

    assert_case(case)
