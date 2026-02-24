from datetime import date, timedelta

from backend.app.saju import calculate_month_pillars_policy_c, _year_index
from backend.app.solar_terms import find_crossings_for_kst_date


def _find_next_solar_term_boundary_day(start: date, *, limit_days: int = 200) -> date:
    d = start
    for _ in range(limit_days):
        if find_crossings_for_kst_date(d):
            return d
        d += timedelta(days=1)
    raise AssertionError("No solar-term boundary day found in search window")


def _find_boundary_day_that_changes_month(start: date, *, limit_days: int = 240) -> date:
    """정책 C가 의미 있게 동작(전/후 월주가 달라짐)하는 절기 경계일을 찾습니다."""

    d = start
    for _ in range(limit_days):
        xs = find_crossings_for_kst_date(d)
        if xs:
            # 가장 이른 경계 기준으로 전/후 월이 달라지는지 확인
            boundary = sorted(xs, key=lambda c: c.when_kst)[0].when_kst
            before_dt = boundary - timedelta(seconds=1)
            after_dt = boundary + timedelta(seconds=1)
            # 월주 계산은 saju 쪽 API를 그대로 사용
            year_stem_index = _year_index(d) % 10
            month_pillars, month_uncertain = calculate_month_pillars_policy_c(d, None, year_stem_index)
            if month_uncertain and len(month_pillars) == 2:
                if (month_pillars[0].stem + month_pillars[0].branch) != (
                    month_pillars[1].stem + month_pillars[1].branch
                ):
                    return d
        d += timedelta(days=1)
    raise AssertionError("No boundary day that changes month found in search window")


def test_policy_c_boundary_day_returns_two_candidates() -> None:
    # 절기(15°) 경계가 포함된 날짜에서는 시간 미상 시 정책 C로 후보 2개를 반환해야 합니다.
    bd = _find_next_solar_term_boundary_day(date(2026, 2, 1))
    year_stem_index = _year_index(bd) % 10
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        bd, None, year_stem_index, timezone="Asia/Seoul"
    )

    assert month_uncertain is True
    assert len(month_pillars) == 2


def test_policy_c_boundary_day_can_change_month() -> None:
    # 정책 C가 의미 있게 작동하는(전/후 월주가 실제로 달라지는) 경계일도 존재해야 합니다.
    bd = _find_boundary_day_that_changes_month(date(2026, 1, 1))
    year_stem_index = _year_index(bd) % 10
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        bd, None, year_stem_index, timezone="Asia/Seoul"
    )

    assert month_uncertain is True
    assert len(month_pillars) == 2
    assert (month_pillars[0].stem + month_pillars[0].branch) != (
        month_pillars[1].stem + month_pillars[1].branch
    )


def test_policy_c_non_boundary_day_returns_single() -> None:
    bd = date(2026, 2, 6)
    year_stem_index = _year_index(bd) % 10
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        bd, None, year_stem_index, timezone="Asia/Seoul"
    )

    assert month_uncertain is False
    assert len(month_pillars) == 1


def test_policy_known_time_is_single() -> None:
    bd = date(2026, 2, 4)
    year_stem_index = _year_index(bd) % 10
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        bd, "12:00", year_stem_index, timezone="Asia/Seoul"
    )

    assert month_uncertain is False
    assert len(month_pillars) == 1
