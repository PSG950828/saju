from __future__ import annotations

"""24절기(태양 황경) 계산 유틸.

- Skyfield를 사용해 태양의 황경(ecliptic longitude)을 계산합니다.
- 절기 시각은 천문 계산값을 사용합니다.

주의
- 에페머리스(de421.bsp)는 최초 1회 다운로드가 필요할 수 있습니다.
- 본 구현은 '절기월' 판정(월 경계)과 '정책 C(시간 미상)'에 필요한 기능을 우선 제공합니다.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache
from typing import Iterable, List, Optional

from skyfield.api import Loader, load
from skyfield.framelib import ecliptic_frame
from datetime import timezone

from skyfield.api import utc

KST = timezone(timedelta(hours=9))


@dataclass(frozen=True)
class SolarTermCrossing:
    name: str
    target_longitude_deg: float
    when_kst: datetime


# 24절기: 태양 황경이 0°, 15°, ..., 345°에 도달하는 순간.
# - 절기월(節氣月)은 보통 입춘(315°)을 寅월(1월) 시작으로 봅니다.
# - 계산 자체는 각도 통과 시각이 핵심이고, 이름은 디버그/표시용입니다.
TERM_NAME_BY_LONGITUDE: dict[float, str] = {
    315.0: "입춘",
    330.0: "우수",
    345.0: "경칩",
    0.0: "춘분",
    15.0: "청명",
    30.0: "곡우",
    45.0: "입하",
    60.0: "소만",
    75.0: "망종",
    90.0: "하지",
    105.0: "소서",
    120.0: "대서",
    135.0: "입추",
    150.0: "처서",
    165.0: "백로",
    180.0: "추분",
    195.0: "한로",
    210.0: "상강",
    225.0: "입동",
    240.0: "소설",
    255.0: "대설",
    270.0: "동지",
    285.0: "소한",
    300.0: "대한",
}


def _to_kst(dt_utc: datetime) -> datetime:
    # KST = UTC+9, tzinfo는 단순 고정 오프셋으로 둡니다(내부 계산 정확도에는 영향 없음)
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=utc)
        return dt_utc.astimezone(KST)


@lru_cache(maxsize=1)
def _skyfield_loader() -> Loader:
    # backend/ 실행 기준 캐시 디렉토리
    return load


@lru_cache(maxsize=1)
def _ephemeris():
    # 1899~2053 범위(de421)
    return _skyfield_loader()("de421.bsp")


@lru_cache(maxsize=1)
def _timescale():
    return _skyfield_loader().timescale()


def _sun_ecliptic_longitude_deg(ts_time) -> float:
    eph = _ephemeris()
    sun = eph["sun"]
    earth = eph["earth"]
    astrometric = earth.at(ts_time).observe(sun)
    ecliptic = astrometric.frame_latlon(ecliptic_frame)
    lon = float(ecliptic[1].degrees)
    # 0~360
    if lon < 0:
        lon += 360.0
    return lon


def _angular_diff_deg(a: float, b: float) -> float:
    """Return signed smallest difference a-b in degrees within [-180, 180]."""
    diff = (a - b + 180.0) % 360.0 - 180.0
    return diff


def find_crossings_in_utc_window(
    start_utc: datetime,
    end_utc: datetime,
    *,
    step_minutes: int = 30,
) -> List[SolarTermCrossing]:
    """주어진 UTC 구간에서 24절기 '황경 목표치 통과'를 찾아냅니다.

    구현 전략(안정성 우선):
    - 일정 간격(step)으로 태양 황경을 샘플링
    - 목표 황경(0,15,...,345)과의 부호가 바뀌는 구간을 찾고
    - 그 구간을 이분법(bisection)으로 초 단위까지 좁힙니다.

    반환은 KST 시각으로 제공합니다.
    """

    if end_utc <= start_utc:
        return []

    ts = _timescale()

    targets = [(i * 15.0, TERM_NAMES[i]) for i in range(24)]

    # 샘플링
    times_utc: List[datetime] = []
    t = start_utc
    while t <= end_utc:
        times_utc.append(t)
        t += timedelta(minutes=step_minutes)
    if times_utc[-1] < end_utc:
        times_utc.append(end_utc)

    lons = []
    for t_utc in times_utc:
        sf_t = ts.from_datetime(t_utc.replace(tzinfo=utc))
        lons.append(_sun_ecliptic_longitude_deg(sf_t))

    crossings: List[SolarTermCrossing] = []

    # 각 타겟별로 부호 반전 탐색
    for target_deg, name in targets:
        prev = _angular_diff_deg(lons[0], target_deg)
        for idx in range(1, len(times_utc)):
            cur = _angular_diff_deg(lons[idx], target_deg)
            # 정확히 찍힌 경우
            if cur == 0.0:
                crossings.append(
                    SolarTermCrossing(name=name, target_longitude_deg=target_deg, when_kst=_to_kst(times_utc[idx]))
                )
                prev = cur
                continue

            # 부호가 바뀌었다면 사이에 통과가 있음
            if (prev < 0 <= cur) or (prev > 0 >= cur):
                lo = times_utc[idx - 1]
                hi = times_utc[idx]

                # 이분 탐색(초 단위 정밀도)
                for _ in range(32):
                    mid = lo + (hi - lo) / 2
                    mid_lon = _sun_ecliptic_longitude_deg(ts.from_datetime(mid.replace(tzinfo=utc)))
                    mid_diff = _angular_diff_deg(mid_lon, target_deg)
                    if mid_diff == 0:
                        lo = hi = mid
                        break
                    if (prev < 0 <= mid_diff) or (prev > 0 >= mid_diff):
                        hi = mid
                        cur = mid_diff
                    else:
                        lo = mid
                        prev = mid_diff

                when = hi
                # 경계가 겹칠 수 있어 살짝 정리
                crossings.append(
                    SolarTermCrossing(name=name, target_longitude_deg=target_deg, when_kst=_to_kst(when))
                )

            prev = cur

    # 중복/정렬
    crossings.sort(key=lambda c: c.when_kst)

    # 같은 시각에 근접한 중복 제거(1분 이내)
    deduped: List[SolarTermCrossing] = []
    for c in crossings:
        if deduped and abs((c.when_kst - deduped[-1].when_kst).total_seconds()) < 60:
            continue
        deduped.append(c)

    return deduped


def find_crossings_for_kst_date(target_date: date) -> List[SolarTermCrossing]:
    """KST 기준 특정 날짜(00:00~23:59:59) 안의 절기 경계들을 반환."""

    # target_date의 KST 00:00 ~ 24:00 를 UTC로 환산
    kst_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=KST)
    kst_end = kst_start + timedelta(days=1)

    # UTC = KST - 9
    start_utc = kst_start.astimezone(utc)
    end_utc = kst_end.astimezone(utc)

    return [
        c
        for c in find_crossings_in_utc_window(start_utc, end_utc, step_minutes=20)
        if kst_start <= c.when_kst < kst_end
    ]
