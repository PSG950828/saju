from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

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


def _sexagenary_index_for_day(target: date) -> int:
    reference = date(1900, 1, 31)
    delta = (target - reference).days
    return delta % 60


def _year_index(target: date) -> int:
    reference_year = 1984  # 甲子年
    return (target.year - reference_year) % 60


def _month_index(target: date) -> int:
    return target.month


def _stem_branch_from_index(index: int) -> Pillar:
    stem = STEMS[index % 10]
    branch = BRANCHES[index % 12]
    return Pillar(stem=stem, branch=branch)


def _hour_branch_index(hour: int) -> int:
    if hour == 23:
        return 0
    return ((hour + 1) // 2) % 12


def _month_stem_index(year_stem_index: int, month_index: int) -> int:
    return (year_stem_index * 2 + month_index) % 10


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
    _ = (_normalize_calendar_type(calendar_type), is_leap_month, timezone)

    year_index = _year_index(birth_date)
    year_pillar = _stem_branch_from_index(year_index)

    month_index = _month_index(birth_date)
    month_branch = BRANCHES[(month_index + 1) % 12]  # Tiger month as 1
    year_stem_index = year_index % 10
    month_stem = STEMS[_month_stem_index(year_stem_index, month_index)]
    month_pillar = Pillar(stem=month_stem, branch=month_branch)

    day_index = _sexagenary_index_for_day(birth_date)
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

    accuracy_note = None
    if not birth_time:
        accuracy_note = "출생시간 미입력으로 시주가 제외되어 분석 정확도가 낮아질 수 있음"

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
