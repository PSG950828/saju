from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from .solar_terms import (
    find_junggi_crossings_for_kst_date,
    find_last_junggi_before_kst,
)

STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

STEM_ELEMENT = {
    "甲": "wood",
    "乙": "wood",
    "丙": "fire",
    "丁": "fire",
    "戊": "earth",
    "己": "earth",
    "庚": "metal",
    "辛": "metal",
    "壬": "water",
    "癸": "water",
}

BRANCH_MAIN_ELEMENT = {
    "寅": "wood",
    "卯": "wood",
    "巳": "fire",
    "午": "fire",
    "辰": "earth",
    "戌": "earth",
    "丑": "earth",
    "未": "earth",
    "申": "metal",
    "酉": "metal",
    "亥": "water",
    "子": "water",
}

HIDDEN_STEMS = {
    "子": [("癸", 1.0)],
    "丑": [("己", 0.6), ("癸", 0.3), ("辛", 0.1)],
    "寅": [("甲", 0.6), ("丙", 0.3), ("戊", 0.1)],
    "卯": [("乙", 1.0)],
    "辰": [("戊", 0.6), ("乙", 0.3), ("癸", 0.1)],
    "巳": [("丙", 0.6), ("庚", 0.3), ("戊", 0.1)],
    "午": [("丁", 0.6), ("己", 0.3), ("丙", 0.1)],
    "未": [("己", 0.6), ("丁", 0.3), ("乙", 0.1)],
    "申": [("庚", 0.6), ("壬", 0.3), ("戊", 0.1)],
    "酉": [("辛", 1.0)],
    "戌": [("戊", 0.6), ("辛", 0.3), ("丁", 0.1)],
    "亥": [("壬", 0.6), ("甲", 0.3), ("戊", 0.1)],
}

STEM_WEIGHTS = {
    "year": 1.0,
    "month": 1.2,
    "day": 1.5,
    "hour": 0.8,
}

BRANCH_WEIGHTS = {
    "year": 1.0,
    "month": 1.4,
    "day": 1.2,
    "hour": 0.8,
}

ELEMENTS = ["wood", "fire", "earth", "metal", "water"]


def _normalize_timezone(timezone: Optional[str]) -> Tuple[str, Optional[str]]:
    """현재 구현은 KST(Asia/Seoul) 기준으로만 정확도를 보장합니다.

    반환:
    - tz: 사용할 timezone 문자열(항상 Asia/Seoul)
    - warning: 지원하지 않는 tz가 들어온 경우 경고 메시지
    """

    if not timezone:
        return "Asia/Seoul", None
    tz = timezone.strip()
    if tz == "Asia/Seoul":
        return tz, None
    return "Asia/Seoul", f"timezone={tz}은(는) 현재 미지원이라 KST(Asia/Seoul)로 계산했습니다"


def _normalize_calendar_type(value: Optional[str]) -> str:
    if not value:
        return "SOLAR"
    value = value.upper().strip()
    return value if value in {"SOLAR", "LUNAR"} else "SOLAR"


@dataclass
class Pillar:
    stem: str
    branch: str


@dataclass
class Chart:
    year: Pillar
    month: Pillar
    day: Pillar
    hour: Optional[Pillar]


@dataclass
class ElementScore:
    elements_raw: Dict[str, float]
    elements_norm: Dict[str, float]
    status: Dict[str, str]
    top_deficiencies: List[str]
    top_excesses: List[str]


@dataclass
class AnalysisResult:
    chart: Chart
    hidden_stems: Dict[str, List[Tuple[str, float]]]
    element_score: ElementScore
    summary: Dict[str, str]
    routines: Dict[str, List[str]]
    accuracy_note: Optional[str]


@dataclass
class OriginalPillar:
    stem: str
    branch: str
    stem_element: str
    branch_element: str


@dataclass
class OriginalResult:
    title: str
    name: str
    birth_date: str
    birth_time: str
    pillars: Dict[str, Optional[OriginalPillar]]
    raw_text: str


# 전통 만세력과 일주(일간/일지)를 맞추기 위한 보정 오프셋.
# 현재 구현은 첨부 샘플(1995-08-28 05:30 KST)에서 만세력 일주(辛卯)에 맞추기 위해
# 기준일 기반 인덱스에 -20을 적용합니다.
DAY_SEXAGENARY_OFFSET = -20


def _sexagenary_index_for_day(target: date) -> int:
    reference = date(1900, 1, 31)
    delta = (target - reference).days
    return (delta + DAY_SEXAGENARY_OFFSET) % 60


def _year_index(target: date) -> int:
    reference_year = 1984  # 甲子年
    return (target.year - reference_year) % 60


def _month_index(target: date) -> int:
    return target.month


def _month_branch_index_from_solar_term_month(month_index_1_to_12: int) -> int:
    """절기월 인덱스(寅월=1 .. 丑월=12)를 지지 인덱스(0..11)로 변환."""

    # 寅(2)부터 시작
    return (2 + (month_index_1_to_12 - 1)) % 12


def _solar_term_month_index_for_kst_datetime(dt_kst: datetime) -> int:
    """KST 기준 시각이 속한 절기월(寅월=1)을 반환.

    구현(정책 C 핵심):
    - 해당 KST 날짜 안에 절기 경계(15° 격자) 통과가 있으면,
      경계 시각 이전/이후에 따라 절기월이 바뀔 수 있음.
    - 여기서는 '그 날짜에서 가장 이른 절기 경계'를 찾고,
      dt_kst가 경계 이전이면 전날의 절기월을 그대로,
      경계 이후면 경계 이후 절기월을 사용합니다.

    참고:
    - 절기월의 기준은 입춘(315°)을 寅월 시작으로 둡니다.
    """

    # 내부 절기 계산은 KST offset-aware datetime을 사용하므로, 입력도 통일
    if dt_kst.tzinfo is None:
        from .solar_terms import KST  # local import to avoid circular

        dt_kst = dt_kst.replace(tzinfo=KST)

    # 절기(중기) 엔진이 사용 불가한 환경(의존성 누락, ephemeris 로드 실패 등)에서도
    # 서버가 죽지 않도록 '간이 규칙(양력 월 기반)'으로 폴백합니다.
    try:
        crossings = find_junggi_crossings_for_kst_date(dt_kst.date())
    except Exception:
        return ((dt_kst.month - 1) % 12) + 1
    crossings = sorted(crossings, key=lambda c: c.when_kst)

    if not crossings:
        try:
            last = find_last_junggi_before_kst(dt_kst)
        except Exception:
            return ((dt_kst.month - 1) % 12) + 1
        if not last:
            # de421 범위 밖 등 예외 케이스: 최후의 폴백
            return ((dt_kst.month - 1) % 12) + 1

        term_long = last.target_longitude_deg
        # 12중기 기준: 30° 격자(k*30). 우수 330°를 寅월 시작으로 둡니다.
        k30 = int(round((term_long % 360.0) / 30.0))
        month_index = ((k30 - 11) % 12) + 1  # k30=11(330°)=1(寅)
        return month_index

    boundary = crossings[0].when_kst
    term_long = crossings[0].target_longitude_deg
    k30 = int(round((term_long % 360.0) / 30.0))
    month_index = ((k30 - 11) % 12) + 1

    if dt_kst < boundary:
        # 경계 이전이면 이전 달로
        month_index = ((month_index - 2) % 12) + 1

    return month_index


def calculate_month_pillars_policy_c(
    birth_date: date,
    birth_time: Optional[str],
    year_stem_index: int,
    *,
    timezone: str = "Asia/Seoul",
) -> Tuple[List[Pillar], bool]:
    """절기월 기반 월주를 계산하고, 시간 미상 정책 C에 따라 후보를 반환합니다.

    반환:
    - month_pillars: 후보 월주 리스트(1개 또는 2개)
    - month_uncertain: 후보가 2개면 True

    정책 C:
    - 출생시간 미상(birth_time=None) AND 해당 KST 날짜에 절기 경계가 존재하면
      경계 이전/이후 두 월주 후보를 반환합니다.
    """

    if timezone != "Asia/Seoul":
        # 현재는 KST 고정 구현(요구사항의 중심).
        # 타임존 확장은 후속으로 진행.
        pass

    # 절기(중기) 엔진이 사용 불가한 환경(의존성 누락, ephemeris 로드 실패 등)에서도
    # 서버가 죽지 않도록 정책 C 로직 역시 안전하게 폴백합니다.
    try:
        crossings = find_junggi_crossings_for_kst_date(birth_date)
    except Exception:
        crossings = []
    has_boundary = len(crossings) > 0

    # birth_time이 있으면 단일 시각으로 절기월 판정
    def pillar_for_month_index(month_index_1_to_12: int) -> Pillar:
        branch = BRANCHES[_month_branch_index_from_solar_term_month(month_index_1_to_12)]
        stem = STEMS[_month_stem_index(year_stem_index, month_index_1_to_12)]
        return Pillar(stem=stem, branch=branch)

    if birth_time:
        hour, minute = [int(x) for x in birth_time.split(":")[:2]]
        dt_kst = datetime(birth_date.year, birth_date.month, birth_date.day, hour, minute, 0)
        month_index = _solar_term_month_index_for_kst_datetime(dt_kst)
        return [pillar_for_month_index(month_index)], False

    if not has_boundary:
        # 경계가 없는 날이면 단일 후보
        month_index = birth_date.month
        # TODO: 경계 없는 날의 절기월 판정(가장 최근 중기 추적)은 후속으로 개선
        month_index = ((month_index - 1) % 12) + 1
        return [pillar_for_month_index(month_index)], False

    # 경계가 있는 날 + 시간 미상: 후보 2개(경계 전/후)
    boundary = sorted(crossings, key=lambda c: c.when_kst)[0].when_kst
    before_dt = boundary - timedelta(seconds=1)
    after_dt = boundary + timedelta(seconds=1)
    before_month = _solar_term_month_index_for_kst_datetime(before_dt)
    after_month = _solar_term_month_index_for_kst_datetime(after_dt)
    return [pillar_for_month_index(before_month), pillar_for_month_index(after_month)], True


def _stem_branch_from_index(index: int) -> Pillar:
    stem = STEMS[index % 10]
    branch = BRANCHES[index % 12]
    return Pillar(stem=stem, branch=branch)


def _hour_branch_index(hour: int) -> int:
    if hour == 23:
        return 0
    return ((hour + 1) // 2) % 12


def _month_stem_index(year_stem_index: int, month_index: int) -> int:
    """전통 만세력 월간 산출(오호둔, 五虎遁) 기반.

    month_index: 절기월 인덱스(寅월=1 .. 丑월=12)

    규칙(연간 -> 寅월 월간):
    - 甲/己 -> 丙寅
    - 乙/庚 -> 戊寅
    - 丙/辛 -> 庚寅
    - 丁/壬 -> 壬寅
    - 戊/癸 -> 甲寅

    이후 월이 하나 진행할 때마다 천간도 하나씩 진행.
    """

    # year_stem_index: 0=甲,1=乙,2=丙,3=丁,4=戊,5=己,6=庚,7=辛,8=壬,9=癸
    yin_start_by_year_stem = {
        0: 2,  # 甲 -> 丙
        5: 2,  # 己 -> 丙
        1: 4,  # 乙 -> 戊
        6: 4,  # 庚 -> 戊
        2: 6,  # 丙 -> 庚
        7: 6,  # 辛 -> 庚
        3: 8,  # 丁 -> 壬
        8: 8,  # 壬 -> 壬
        4: 0,  # 戊 -> 甲
        9: 0,  # 癸 -> 甲
    }
    start = yin_start_by_year_stem[year_stem_index]
    return (start + (month_index - 1)) % 10


def _hour_stem_index(day_stem_index: int, hour_index: int) -> int:
    return (day_stem_index * 2 + hour_index) % 10


def calculate_chart(
    birth_date: date,
    birth_time: Optional[str],
    *,
    calendar_type: str = "SOLAR",
    is_leap_month: bool = False,
    timezone: str = "Asia/Seoul",
) -> Chart:
    # NOTE: 현재 구현은 프로토타입 수준으로, calendar_type/is_leap_month/timezone을
    # 실제 변환(음력/절기) 계산에 반영하지 않습니다.
    # 다음 단계에서 절기월/음력월 모드를 이 파라미터로 구현합니다.
    _, _ = _normalize_calendar_type(calendar_type), is_leap_month
    timezone, _tz_warn = _normalize_timezone(timezone)

    # 전통 만세력 규칙: 하루 시작을 자시(23:00)로 보기도 함.
    # 23:00~23:59 출생은 일주(일간/일지) 계산에서 다음날로 보정.
    day_date_for_pillar = birth_date
    if birth_time:
        try:
            birth_hour = int(birth_time.split(":")[0])
        except ValueError:
            birth_hour = -1
        if birth_hour == 23:
            day_date_for_pillar = birth_date + timedelta(days=1)

    year_index = _year_index(birth_date)
    year_pillar = _stem_branch_from_index(year_index)

    # 절기월 기반 월지(지지)를 계산
    # - birth_time이 있으면 해당 시각으로 절기월을 확정
    # - birth_time이 없으면 정책 C가 필요하지만, Chart는 단일 월주만 담을 수 있어
    #   여기서는 "대표값"으로 경계 이후(month_index after)를 사용합니다.
    year_stem_index = year_index % 10

    month_pillar_candidates, month_uncertain = calculate_month_pillars_policy_c(
        birth_date,
        birth_time,
        year_stem_index,
        timezone=timezone,
    )
    _ = month_uncertain
    representative_month = month_pillar_candidates[-1]
    month_branch = representative_month.branch
    month_pillar = Pillar(stem=representative_month.stem, branch=month_branch)

    day_index = _sexagenary_index_for_day(day_date_for_pillar)
    day_pillar = _stem_branch_from_index(day_index)

    hour_pillar: Optional[Pillar] = None
    if birth_time:
        hour = int(birth_time.split(":")[0])
        hour_index = _hour_branch_index(hour)
        hour_branch = BRANCHES[hour_index]
        day_stem_index = day_index % 10
        hour_stem = STEMS[_hour_stem_index(day_stem_index, hour_index)]
        hour_pillar = Pillar(stem=hour_stem, branch=hour_branch)

    return Chart(year=year_pillar, month=month_pillar, day=day_pillar, hour=hour_pillar)


def _add_score(scores: Dict[str, float], element: str, value: float) -> None:
    scores[element] += value


def calculate_elements(chart: Chart) -> ElementScore:
    scores = {element: 0.0 for element in ELEMENTS}

    pillars = {
        "year": chart.year,
        "month": chart.month,
        "day": chart.day,
    }
    if chart.hour:
        pillars["hour"] = chart.hour

    hidden_stems = {}

    for key, pillar in pillars.items():
        stem_element = STEM_ELEMENT[pillar.stem]
        _add_score(scores, stem_element, STEM_WEIGHTS[key])

        branch_element = BRANCH_MAIN_ELEMENT[pillar.branch]
        _add_score(scores, branch_element, BRANCH_WEIGHTS[key])

        branch_hidden = HIDDEN_STEMS[pillar.branch]
        hidden_stems[pillar.branch] = branch_hidden
        hidden_weight = BRANCH_WEIGHTS[key] * 0.5
        for stem, ratio in branch_hidden:
            _add_score(scores, STEM_ELEMENT[stem], hidden_weight * ratio)

    total = sum(scores.values())
    normalized = {element: round(value / total * 100, 2) for element, value in scores.items()}

    status = {}
    for element, value in normalized.items():
        if value < 8:
            status[element] = "VERY_LOW"
        elif value < 14:
            status[element] = "LOW"
        elif value < 24:
            status[element] = "NORMAL"
        elif value < 32:
            status[element] = "HIGH"
        else:
            status[element] = "VERY_HIGH"

    sorted_elements = sorted(normalized.items(), key=lambda item: item[1])
    top_deficiencies = [element for element, _ in sorted_elements]
    top_excesses = [element for element, _ in reversed(sorted_elements)]

    return ElementScore(
        elements_raw=scores,
        elements_norm=normalized,
        status=status,
        top_deficiencies=top_deficiencies,
        top_excesses=top_excesses,
    )


def _routine_for_element(element: str) -> List[str]:
    routines = {
        "wood": ["아침 산책", "스트레칭", "녹색 채소 섭취", "성장 목표 설정"],
        "fire": ["아침 햇빛 노출", "심박수 운동", "따뜻한 식사", "오전 집중 작업"],
        "earth": ["정리정돈 10분", "규칙적인 식사", "토성색 의상", "마음 안정 호흡"],
        "metal": ["집중 작업 25분", "호흡 정리", "하얀색 포인트", "필요 없는 것 버리기"],
        "water": ["수분 섭취", "저녁 산책", "일기 작성", "차분한 음악"],
    }
    return routines[element]


def analyze(
    birth_date: date,
    birth_time: Optional[str],
    *,
    calendar_type: str = "SOLAR",
    is_leap_month: bool = False,
    timezone: str = "Asia/Seoul",
) -> AnalysisResult:
    timezone, tz_warn = _normalize_timezone(timezone)

    solar_warn: Optional[str] = None
    try:
        # 절기 엔진이 실사용 가능한지 빠르게 체크합니다.
        # (skyfield/de421 누락 시 예외가 나며, 서비스는 폴백으로 계속 동작)
        _ = find_junggi_crossings_for_kst_date(birth_date)
    except Exception:
        solar_warn = "절기(중기) 계산 엔진 사용 불가로 간이 규칙(양력 월 기반)으로 폴백했습니다"

    chart = calculate_chart(
        birth_date,
        birth_time,
        calendar_type=calendar_type,
        is_leap_month=is_leap_month,
        timezone=timezone,
    )
    element_score = calculate_elements(chart)

    main_deficiency = element_score.top_deficiencies[0]
    routines = {
        "primary": _routine_for_element(main_deficiency),
    }

    summary = {
        "personality": f"{main_deficiency} 기운을 보강하면 균형감이 높아집니다.",
        "money_work": "집중 루틴을 통해 성과를 높이는 흐름이 필요합니다.",
        "relationships": "호흡을 가다듬고 여유 있는 소통이 도움이 됩니다.",
        "health": "수면과 식사 리듬을 일정하게 유지하세요.",
    }

    notes: List[str] = []
    if tz_warn:
        notes.append(tz_warn)
    if solar_warn:
        notes.append(solar_warn)
    if not birth_time:
        notes.append("출생시간 미입력으로 시주가 제외되어 분석 정확도가 낮아질 수 있음")
    accuracy_note = " / ".join(notes) if notes else None

    hidden_map = {
        "year_branch": HIDDEN_STEMS[chart.year.branch],
        "month_branch": HIDDEN_STEMS[chart.month.branch],
        "day_branch": HIDDEN_STEMS[chart.day.branch],
    }
    if chart.hour:
        hidden_map["hour_branch"] = HIDDEN_STEMS[chart.hour.branch]

    return AnalysisResult(
        chart=chart,
        hidden_stems=hidden_map,
        element_score=element_score,
        summary=summary,
        routines=routines,
        accuracy_note=accuracy_note,
    )


def _birth_date_text(birth_date: date) -> str:
    return f"{birth_date.year}年 {birth_date.month}月 {birth_date.day}日"


def build_original_result(
    birth_date: date,
    birth_time: Optional[str],
    name: Optional[str],
    *,
    calendar_type: str = "SOLAR",
    is_leap_month: bool = False,
    timezone: str = "Asia/Seoul",
) -> OriginalResult:
    chart = calculate_chart(
        birth_date,
        birth_time,
        calendar_type=calendar_type,
        is_leap_month=is_leap_month,
        timezone=timezone,
    )
    title = "四柱八字"
    display_name = name or "未詳"
    birth_date_text = _birth_date_text(birth_date)

    if birth_time:
        hour = int(birth_time.split(":")[0])
        hour_branch = BRANCHES[_hour_branch_index(hour)]
        birth_time_text = f"{hour_branch}時"
    else:
        birth_time_text = "時柱未詳"

    def pillar_payload(pillar: Pillar) -> OriginalPillar:
        return OriginalPillar(
            stem=pillar.stem,
            branch=pillar.branch,
            stem_element=STEM_ELEMENT[pillar.stem],
            branch_element=BRANCH_MAIN_ELEMENT[pillar.branch],
        )

    pillars: Dict[str, Optional[OriginalPillar]] = {
        "hour": pillar_payload(chart.hour) if chart.hour else None,
        "day": pillar_payload(chart.day),
        "month": pillar_payload(chart.month),
        "year": pillar_payload(chart.year),
    }

    lines = [
        title,
        f"姓名: {display_name}",
        f"生年月日: {birth_date_text}",
        f"出生時間: {birth_time_text}",
        "",
        f"時柱: {(chart.hour.stem + chart.hour.branch) if chart.hour else '未詳'}",
        f"日柱: {chart.day.stem}{chart.day.branch}",
        f"月柱: {chart.month.stem}{chart.month.branch}",
        f"年柱: {chart.year.stem}{chart.year.branch}",
    ]
    raw_text = "\n".join(lines)

    return OriginalResult(
        title=title,
        name=display_name,
        birth_date=birth_date_text,
        birth_time=birth_time_text,
        pillars=pillars,
        raw_text=raw_text,
    )
