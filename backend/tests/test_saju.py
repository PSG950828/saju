from datetime import date

from backend.app.saju import analyze, calculate_chart, calculate_elements


def test_calculate_chart_without_time():
    chart = calculate_chart(date(1990, 5, 17), None)
    assert chart.year.stem
    assert chart.month.branch
    assert chart.day.stem
    assert chart.hour is None


def test_element_score_normalization():
    chart = calculate_chart(date(1990, 5, 17), "09:30")
    score = calculate_elements(chart)
    total = sum(score.elements_norm.values())
    assert 99.0 <= total <= 101.0


def test_analysis_has_routines():
    result = analyze(date(1990, 5, 17), "09:30")
    assert "primary" in result.routines
    assert len(result.routines["primary"]) == 4
