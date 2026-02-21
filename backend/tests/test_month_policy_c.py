from datetime import date, timedelta

from backend.app.saju import calculate_month_pillars_policy_c, _year_index
from backend.app.solar_terms import find_junggi_crossings_for_kst_date


def _find_next_junggi_boundary_day(start: date, *, limit_days: int = 120) -> date:
    d = start
    for _ in range(limit_days):
        if find_junggi_crossings_for_kst_date(d):
            return d
        d += timedelta(days=1)
    raise AssertionError("No junggi boundary day found in search window")


def test_policy_c_boundary_day_returns_two_candidates() -> None:
    # 12중기(30°) 경계가 포함된 날짜에서는 시간 미상 시 정책 C로 후보 2개를 반환해야 합니다.
    bd = _find_next_junggi_boundary_day(date(2026, 2, 1))
    year_stem_index = _year_index(bd) % 10
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        bd, None, year_stem_index, timezone="Asia/Seoul"
    )

    assert month_uncertain is True
    assert len(month_pillars) == 2
    assert month_pillars[0].stem + month_pillars[0].branch != month_pillars[1].stem + month_pillars[1].branch


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
