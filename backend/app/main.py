from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

"""FastAPI app.

Deployment note:
- When running from within `backend/` we import from the top-level package `app.*`.
- When running from repository root we import from `backend.app.*`.
This small compatibility shim allows both deployment styles without requiring
environment-specific PYTHONPATH tweaks.
"""

try:
    from app.saju import analyze, build_original_result, calculate_month_pillars_policy_c, _year_index
    from app.solar_terms import find_junggi_crossings_for_kst_date
    from app.schemas import AnalysisResponse, Chart, ChartInput, OriginalInput, OriginalResponse, Pillar
except ModuleNotFoundError:  # pragma: no cover
    from backend.app.saju import analyze, build_original_result, calculate_month_pillars_policy_c, _year_index
    from backend.app.solar_terms import find_junggi_crossings_for_kst_date
    from backend.app.schemas import AnalysisResponse, Chart, ChartInput, OriginalInput, OriginalResponse, Pillar

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
    solar_terms_ready = True
    solar_terms_warning = None
    try:
        # 절기(중기) 엔진이 실제로 사용 가능한지 빠르게 확인합니다.
        # - skyfield가 없거나(deps 누락)
        # - de421.bsp 로드가 실패하는 경우
        # 여기서 예외가 발생할 수 있습니다.
        _ = find_junggi_crossings_for_kst_date(datetime.utcnow().date())
    except Exception as exc:  # pragma: no cover
        solar_terms_ready = False
        solar_terms_warning = f"solar_terms_unavailable: {type(exc).__name__}: {exc}"

    payload = {"status": "ok", "solar_terms_ready": solar_terms_ready}
    if solar_terms_warning:
        payload["warning"] = solar_terms_warning
    return payload


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
