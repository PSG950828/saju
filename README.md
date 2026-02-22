# 사주 기반 개인 에너지 운영 플랫폼 (MVP)

사주 입력 → 오행 분석 → 보정 루틴 추천 → 카드형 결과를 제공하는 MVP입니다.

## 포함 기능

- 사주 8자 산출 (간이 계산)
- 오행 점수 계산 및 부족/과다 판정
- 카드형 결과 UI
- 오늘의 보정 루틴 추천
- 간단 리포트 문구

## 빠른 시작

### 백엔드

1. 의존성 설치
2. API 실행 (기본: http://localhost:8000)

### 프론트엔드

1. 의존성 설치
2. 개발 서버 실행 (기본: http://localhost:3000)

## 환경 변수

- `NEXT_PUBLIC_API_BASE` : 백엔드 주소 (기본값: http://localhost:8000)

## 배포(Render) 가이드

이 레포는 **두 가지 배포 방식(레포 루트 기준 / `backend/` 기준)** 을 모두 지원합니다.

### 공통: 의존성 설치

- 루트에 `requirements.txt`가 있고, 내부에서 `backend/requirements.txt`를 include 합니다.
- 따라서 Render가 어느 경로에서 `pip install -r requirements.txt`를 실행하든 백엔드 의존성이 설치됩니다.

### 방식 A) Root Directory = `backend/`

- Build Command 예시
	- `pip install -r requirements.txt`
- Start Command 예시
	- `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 방식 B) Root Directory = 레포 루트

- Build Command 예시
	- `pip install -r requirements.txt`
- Start Command 예시
	- `uvicorn backend_main:app --host 0.0.0.0 --port $PORT`

### /health로 절기(중기) 엔진 상태 확인

절기(중기) 계산은 `skyfield + de421.bsp`를 사용합니다.

- `/health` 응답에 `solar_terms_ready`가 포함됩니다.
	- `true`: 절기 엔진 정상 사용 중
	- `false`: 절기 엔진이 사용 불가하여 **간이 규칙(양력 월 기반)으로 폴백** 중

폴백 시에는 `/api/analysis` 응답의 `accuracy_note`에도 경고가 포함됩니다.

## 참고 사항

- 기본은 전통 만세력 정합을 위해 절기(중기) 기반 로직을 사용합니다.
- 단, 배포 환경에서 `skyfield` 또는 `de421.bsp`가 누락되거나 로드에 실패하면 서버는 계속 동작하되
	월주 계산은 간이 규칙(양력 월 기반)으로 폴백합니다. (정확도 경고는 `accuracy_note` 및 `/health`로 노출)
- 음력 변환은 아직 지원하지 않습니다. (Phase 2에서 보완)
- PWA 아이콘은 placeholder 경로입니다. `frontend/public`에 아이콘을 추가하세요.
