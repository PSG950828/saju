from __future__ import annotations

from datetime import date

from backend.app.saju import calculate_month_pillars_policy_c


def _pillars_to_str(pillars) -> list[str]:
    return [p.stem + p.branch for p in pillars]


def test_policy_c_no_boundary_day_returns_single_candidate() -> None:
    """정책 C: 시간 미상 + 절기 경계가 '없는' 날이면 월주 후보 1개."""

    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        birth_date=date(1988, 9, 20),
        birth_time=None,
        year_stem_index=4,  # 戊(=戊辰년 케이스와 일치)
        timezone="Asia/Seoul",
    )

    assert month_uncertain is False
    assert len(month_pillars) == 1
    assert _pillars_to_str(month_pillars) == ["辛酉"]


def test_policy_c_boundary_day_returns_two_candidates() -> None:
    """정책 C: 시간 미상 + 절기(15°) 경계가 '있는' 날이면 월주 후보 2개.

    boundary day 예시는 1993-02-04(입춘)로 잡습니다.
    - 이 날짜는 KST 기준 15° crossing(입춘 315°)이 실제로 존재합니다.
    """

    # 1993년은 아직 입춘 전/후에 연도가 갈리지만,
    # 정책C의 month 후보 산출은 year_stem_index만 필요합니다.
    # 여기서는 1993-02-04 04:38 케이스(癸酉)의 year stem index(癸=9)를 사용.
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        birth_date=date(1993, 2, 4),
        birth_time=None,
        year_stem_index=9,  # 癸
        timezone="Asia/Seoul",
    )

    assert month_uncertain is True
    assert len(month_pillars) == 2

    # 후보는 '경계 전 월주'와 '경계 후 월주'이며,
    # 구체 값은 절기 엔진(Skyfield/de421)와 월간(오호둔) 규칙의 조합 결과입니다.
    # 앱 절입시각 표가 도입되면 이 값은 앱 기준으로 업데이트될 수 있습니다.
    assert _pillars_to_str(month_pillars)[0] != _pillars_to_str(month_pillars)[1]
