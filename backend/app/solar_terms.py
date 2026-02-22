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

from datetime import timezone

try:
    from skyfield.api import Loader, load
    from skyfield.api import utc
    from skyfield.framelib import ecliptic_frame

    SKYFIELD_AVAILABLE = True
except ModuleNotFoundError:  # pragma: no cover
    # 배포/런타임 환경에서 skyfield가 누락되어도 서버가 부팅은 되도록 합니다.
    # (절기 기반 월주 계산은 호출 시 예외를 발생시키고, 상위에서 폴백 처리)
    Loader = object  # type: ignore
    load = None  # type: ignore
    utc = None  # type: ignore
    ecliptic_frame = None  # type: ignore
    SKYFIELD_AVAILABLE = False

# NOTE: skyfield가 없는 환경에서도 타입체커가 깨지지 않도록 Loader를 타입 별칭으로 둡니다.
_LoaderType = Loader  # type: ignore

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


# 12중기(中氣): 30° 간격(0, 30, ..., 330).
# 전통 만세력의 월주 월지/월간은 보통 '중기'를 월 경계로 사용합니다.
JUNGGI_NAME_BY_LONGITUDE: dict[float, str] = {
    330.0: "우수",
    0.0: "춘분",
    30.0: "곡우",
    60.0: "소만",
    90.0: "하지",
    120.0: "대서",
    150.0: "처서",
    180.0: "추분",
    210.0: "상강",
    240.0: "소설",
    270.0: "동지",
    300.0: "대한",
}


def filter_junggi_crossings(crossings: List[SolarTermCrossing]) -> List[SolarTermCrossing]:
    """15° 격자 crossing 중 12중기(30°)에 해당하는 것만 남깁니다."""

    result: List[SolarTermCrossing] = []
    for c in crossings:
        deg = float(c.target_longitude_deg % 360.0)
        if abs((deg % 30.0)) < 1e-9:
            name = JUNGGI_NAME_BY_LONGITUDE.get(deg, c.name)
            result.append(SolarTermCrossing(name=name, target_longitude_deg=deg, when_kst=c.when_kst))
    result.sort(key=lambda x: x.when_kst)
    return result


def _to_kst(dt_utc: datetime) -> datetime:
    # KST = UTC+9, tzinfo는 단순 고정 오프셋으로 둡니다(내부 계산 정확도에는 영향 없음)
        if dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=utc)
        return dt_utc.astimezone(KST)


@lru_cache(maxsize=1)
def _skyfield_loader() -> _LoaderType:
    if not SKYFIELD_AVAILABLE:  # pragma: no cover
        raise RuntimeError("skyfield is not installed")
    # backend/ 실행 기준 캐시 디렉토리
    return load


@lru_cache(maxsize=1)
def _ephemeris():
    if not SKYFIELD_AVAILABLE:  # pragma: no cover
        raise RuntimeError("skyfield is not installed")
    # 1899~2053 범위(de421)
    return _skyfield_loader()("de421.bsp")


@lru_cache(maxsize=1)
def _timescale():
    if not SKYFIELD_AVAILABLE:  # pragma: no cover
        raise RuntimeError("skyfield is not installed")
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


def _unwrap_about_target(lon_deg: float, target_deg: float) -> float:
    """목표각을 중심으로 황경을 연속 공간으로 펼칩니다.

    lon_deg는 [0,360) 범위입니다.
    target_deg 근처에서는 lon을 target을 기준으로 [-180,180)로 접기 때문에
    다른 타겟(예: 135°)에서의 가짜 부호 반전이 생길 수 있습니다.

    해결:
    - target_deg를 0으로 옮기도록 회전한 뒤
    - [-180,180)로 접은 값을 반환합니다.
    """

    rotated = (lon_deg - target_deg) % 360.0
    if rotated >= 180.0:
        rotated -= 360.0
    return rotated


def find_crossings_in_utc_window(
    start_utc: datetime,
    end_utc: datetime,
    *,
    step_minutes: int = 30,
) -> List[SolarTermCrossing]:
    """주어진 UTC 구간에서 24절기(황경 15° 격자) 경계 통과를 찾아냅니다.

    기존 방식(각 타겟별 부호 반전)은 0/360 래핑 구간에서 오탐이 생길 수 있어,
    시간축에서 황경을 '단조 증가'하도록 언랩(unwrapped)한 뒤,
    15° 격자선을 넘어서는 순간을 찾아 절기 경계로 기록합니다.
    """

    if end_utc <= start_utc:
        return []

    ts = _timescale()

    # 샘플링
    times_utc: List[datetime] = []
    t = start_utc
    while t <= end_utc:
        times_utc.append(t)
        t += timedelta(minutes=step_minutes)
    if times_utc[-1] < end_utc:
        times_utc.append(end_utc)

    lons: List[float] = []
    for t_utc in times_utc:
        sf_t = ts.from_datetime(t_utc.replace(tzinfo=utc))
        lons.append(_sun_ecliptic_longitude_deg(sf_t))

    # 언랩: 0~360 래핑을 제거해 시간축으로 단조 증가하도록 만듦
    unwrapped: List[float] = [lons[0]]
    for i in range(1, len(lons)):
        prev = unwrapped[-1]
        cur = lons[i]
        # 갑자기 350 -> 10 으로 떨어지면 360을 더해 이어붙임
        while cur < (prev - 180.0):
            cur += 360.0
        # 혹시 반대로 튀는 케이스도 방어
        while cur > (prev + 180.0):
            cur -= 360.0
        unwrapped.append(cur)

    crossings: List[SolarTermCrossing] = []
    for i in range(1, len(times_utc)):
        a = unwrapped[i - 1]
        b = unwrapped[i]
        if b == a:
            continue

        # (a,b] 구간에서 넘어서는 15도 격자 k를 찾는다.
        start_k = int((a // 15.0))
        end_k = int((b // 15.0))

        for k in range(start_k + 1, end_k + 1):
            target = k * 15.0
            # 실제 각도는 0~360로 환원
            target_mod = target % 360.0
            name = TERM_NAME_BY_LONGITUDE.get(target_mod, f"TERM_{target_mod:.0f}")

            lo = times_utc[i - 1]
            hi = times_utc[i]
            # 이분 탐색: (lo, hi]에서 unwrapped longitude가 target에 도달하는 순간
            for _ in range(32):
                mid = lo + (hi - lo) / 2
                mid_lon = _sun_ecliptic_longitude_deg(ts.from_datetime(mid.replace(tzinfo=utc)))
                # mid_lon을 a 기준으로 언랩
                mid_unwrapped = mid_lon
                while mid_unwrapped < (a - 180.0):
                    mid_unwrapped += 360.0
                while mid_unwrapped > (a + 180.0):
                    mid_unwrapped -= 360.0

                if mid_unwrapped >= target:
                    hi = mid
                else:
                    lo = mid
            crossings.append(
                SolarTermCrossing(name=name, target_longitude_deg=target_mod, when_kst=_to_kst(hi))
            )

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


def find_junggi_crossings_for_kst_date(target_date: date) -> List[SolarTermCrossing]:
    """KST 날짜 안의 12중기(30°) 경계만 반환합니다."""

    return filter_junggi_crossings(find_crossings_for_kst_date(target_date))


def find_last_crossing_before_kst(
    dt_kst: datetime,
    *,
    lookback_days: int = 40,
) -> Optional[SolarTermCrossing]:
    """주어진 KST 시각 이전의 가장 최근 절기 경계를 찾습니다.

    절기월 판정(경계가 없는 날)을 위해 필요합니다.
    - 일반적으로 15° 간격 경계는 평균 15.2일마다 1회 생기므로
      40일만 뒤져도 충분합니다.
    """

    if dt_kst.tzinfo is None:
        dt_kst = dt_kst.replace(tzinfo=KST)

    # KST -> UTC window
    end_utc = dt_kst.astimezone(utc)
    start_utc = (dt_kst - timedelta(days=lookback_days)).astimezone(utc)
    xs = find_crossings_in_utc_window(start_utc, end_utc, step_minutes=60)
    xs = [x for x in xs if x.when_kst <= dt_kst]
    if not xs:
        return None
    return max(xs, key=lambda c: c.when_kst)


def find_last_junggi_before_kst(
    dt_kst: datetime,
    *,
    lookback_days: int = 80,
) -> Optional[SolarTermCrossing]:
    """주어진 KST 시각 이전의 가장 최근 '중기(30°)' 경계를 찾습니다."""

    last = find_last_crossing_before_kst(dt_kst, lookback_days=lookback_days)
    if not last:
        return None

    # 더 이전까지 스캔해 중기만 걸러서 최대를 고른다.
    end_utc = (dt_kst.replace(tzinfo=KST) if dt_kst.tzinfo is None else dt_kst).astimezone(utc)
    start_utc = (dt_kst - timedelta(days=lookback_days)).astimezone(utc)
    xs = find_crossings_in_utc_window(start_utc, end_utc, step_minutes=60)
    xs = filter_junggi_crossings([x for x in xs if x.when_kst <= dt_kst])
    if not xs:
        return None
    return max(xs, key=lambda c: c.when_kst)
