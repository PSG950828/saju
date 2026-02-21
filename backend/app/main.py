from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.saju import analyze, build_original_result, calculate_month_pillars_policy_c, _year_index
from app.schemas import AnalysisResponse, Chart, ChartInput, OriginalInput, OriginalResponse, Pillar

app = FastAPI(title="Saju Energy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analysis", response_model=AnalysisResponse)
async def create_analysis(payload: ChartInput) -> AnalysisResponse:
    if payload.gender not in {"M", "F"}:
        raise HTTPException(status_code=400, detail="gender must be M or F")

    try:
        birth_date = datetime.strptime(payload.birth_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="birth_date must be YYYY-MM-DD") from exc

    analysis = analyze(
        birth_date=birth_date,
        birth_time=payload.birth_time,
        calendar_type=payload.calendar_type,
        is_leap_month=payload.is_leap_month,
        timezone=payload.timezone,
    )

    # 월주 후보(정책 C): 시간 미상 + 절기 경계일이면 2개
    year_index = _year_index(birth_date)
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        birth_date,
        payload.birth_time,
        year_index % 10,
        timezone=payload.timezone,
    )

    chart = Chart(
        year_pillar=Pillar(stem=analysis.chart.year.stem, branch=analysis.chart.year.branch),
        month_pillar=Pillar(stem=analysis.chart.month.stem, branch=analysis.chart.month.branch),
        day_pillar=Pillar(stem=analysis.chart.day.stem, branch=analysis.chart.day.branch),
        hour_pillar=(
            Pillar(stem=analysis.chart.hour.stem, branch=analysis.chart.hour.branch)
            if analysis.chart.hour
            else None
        ),
    )

    return AnalysisResponse(
        chart=chart,
        month_pillars=[Pillar(stem=p.stem, branch=p.branch) for p in month_pillars],
        month_uncertain=month_uncertain,
        hidden_stems=analysis.hidden_stems,
        element_score=analysis.element_score.__dict__,
        summary=analysis.summary,
        routines=analysis.routines,
        accuracy_note=analysis.accuracy_note,
    )


@app.post("/api/original", response_model=OriginalResponse)
async def create_original(payload: OriginalInput) -> OriginalResponse:
    if payload.gender not in {"M", "F"}:
        raise HTTPException(status_code=400, detail="gender must be M or F")

    try:
        birth_date = datetime.strptime(payload.birth_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="birth_date must be YYYY-MM-DD") from exc

    original = build_original_result(
        birth_date=birth_date,
        birth_time=payload.birth_time,
        name=payload.name,
        calendar_type=payload.calendar_type,
        is_leap_month=payload.is_leap_month,
        timezone=payload.timezone,
    )

    year_index = _year_index(birth_date)
    month_pillars, month_uncertain = calculate_month_pillars_policy_c(
        birth_date,
        payload.birth_time,
        year_index % 10,
        timezone=payload.timezone,
    )

    return OriginalResponse(
        title=original.title,
        name=original.name,
        birth_date=original.birth_date,
        birth_time=original.birth_time,
        month_pillars=[Pillar(stem=p.stem, branch=p.branch) for p in month_pillars],
        month_uncertain=month_uncertain,
        pillars={
            key: pillar.__dict__ if pillar else None
            for key, pillar in original.pillars.items()
        },
        raw_text=original.raw_text,
    )
