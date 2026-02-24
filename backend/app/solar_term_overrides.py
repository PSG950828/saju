from __future__ import annotations

"""절기(절입시각) override 테이블.

목표
- 기준 만세력 앱의 '절입시간' 표를 우선 적용해, 앱과의 4주 정합을 맞춥니다.
- 우선순위: override(앱 표) > Skyfield 계산값

키 설계
- (KST date, target_longitude_deg) -> KST datetime
- 예) (1993-02-04, 315.0) = 1993-02-04 04:37:00+09:00

운영 방식
- A 방식: 케이스별로 앱 절입시간을 계속 제공받아 이 테이블을 보강합니다.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, Optional, Tuple

KST = timezone(timedelta(hours=9))


@dataclass(frozen=True)
class SolarTermOverride:
    target_longitude_deg: float
    when_kst: datetime


# (date, deg) -> override
OVERRIDES: Dict[Tuple[date, float], SolarTermOverride] = {
    # 1993-02-04 입춘(315°) 절입시간: 앱 기준 04:37:00 (KST)
    (date(1993, 2, 4), 315.0): SolarTermOverride(
        target_longitude_deg=315.0,
        when_kst=datetime(1993, 2, 4, 4, 37, 0, tzinfo=KST),
    ),
}


def get_override(target_date: date, target_longitude_deg: float) -> Optional[SolarTermOverride]:
    """날짜 + 절기각에 대한 override가 있으면 반환."""

    deg = float(target_longitude_deg % 360.0)
    return OVERRIDES.get((target_date, deg))
