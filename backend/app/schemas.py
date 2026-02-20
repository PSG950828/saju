from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


class ChartInput(BaseModel):
    name: Optional[str] = Field(None, description="display name")
    birth_date: str = Field(..., description="YYYY-MM-DD")
    gender: str = Field(..., description="M or F")
    birth_time: Optional[str] = Field(None, description="HH:MM")
    calendar_type: str = Field("SOLAR", description="SOLAR or LUNAR")
    is_leap_month: bool = False
    timezone: str = "Asia/Seoul"


class Pillar(BaseModel):
    stem: str
    branch: str


class Chart(BaseModel):
    year_pillar: Pillar
    month_pillar: Pillar
    day_pillar: Pillar
    hour_pillar: Optional[Pillar]


class ElementScore(BaseModel):
    elements_raw: Dict[str, float]
    elements_norm: Dict[str, float]
    status: Dict[str, str]
    top_deficiencies: List[str]
    top_excesses: List[str]


class AnalysisResponse(BaseModel):
    chart: Chart
    hidden_stems: Dict[str, List[Tuple[str, float]]]
    element_score: ElementScore
    summary: Dict[str, str]
    routines: Dict[str, List[str]]
    accuracy_note: Optional[str]


class OriginalInput(BaseModel):
    name: Optional[str] = Field(None, description="display name")
    birth_date: str = Field(..., description="YYYY-MM-DD")
    gender: str = Field(..., description="M or F")
    birth_time: Optional[str] = Field(None, description="HH:MM")
    calendar_type: str = Field("SOLAR", description="SOLAR or LUNAR")
    is_leap_month: bool = False
    timezone: str = "Asia/Seoul"


class OriginalPillar(BaseModel):
    stem: str
    branch: str
    stem_element: str
    branch_element: str


class OriginalResponse(BaseModel):
    title: str
    name: str
    birth_date: str
    birth_time: str
    pillars: Dict[str, Optional[OriginalPillar]]
    raw_text: str
