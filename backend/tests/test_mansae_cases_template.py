"""사용자 제공 '만세력 정답 케이스'를 여기에 계속 추가하세요.

규칙:
- 케이스 1개 = MansaeCase 1개
- 기대값(expected_*)은 앱 스크린샷에 표시된 '년주/월주/일주/시주'를 그대로 적습니다.
- 시간 미상 케이스는 birth_time=None, expected_hour=None 로 둡니다.

주의:
- 이 엔진은 현재 KST(Asia/Seoul) 기준만 정확도를 보장합니다.
- 시간 미상 정책 C의 '월주 후보 2개'는 API 응답(month_pillars)에서 다루며,
  이 템플릿은 기본 chart.month_pillar(단일 값) 검증용입니다.
  (월주 후보 검증은 별도 테스트로 추가하는 걸 권장)
"""

from __future__ import annotations

from datetime import date

from backend.tests.helpers_mansae_cases import MansaeCase, assert_case


def test_template_keep_me_green() -> None:
    """템플릿 파일이 비어 있어도 테스트 스위트가 깨지지 않도록 유지."""

    case = MansaeCase(
        birth_date=date(1995, 8, 28),
        birth_time="05:30",
        expected_year="乙亥",
        expected_month="甲申",
        expected_day="辛卯",
        expected_hour="辛卯",
        comment="샘플 고정 케이스(기존 테스트와 동일)",
    )
    assert_case(case)
