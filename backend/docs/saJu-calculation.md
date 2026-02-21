# 사주 계산 기준(현재 구현)

이 문서는 **현재 백엔드 구현(`backend/app/saju.py`)이 실제로 무엇을 기준으로 계산하는지**를 기록합니다.

> 주의: 현재 구현은 ‘전통 만세력 앱’과 동일한 정밀도를 목표로 한 엔진이 아니라,
> 데모/프로토타입 수준의 단순화된 모델입니다.

## 1) 시간 미상 처리

- 입력 `birth_time`이 `null`(또는 빈 값)인 경우:
  - **시주(hour pillar)는 계산하지 않고 제외합니다.**
  - 즉, `chart.hour`가 `None`이 되며, 오행 집계에서도 hour pillar가 빠집니다.
- 정확도 안내:
  - `birth_time`이 없으면 `accuracy_note`에
    - `"출생시간 미입력으로 시주가 제외되어 분석 정확도가 낮아질 수 있음"`
    가 포함됩니다.

### (옵션 제안) 12개 시주 후보 범위 요약

현재는 미구현입니다. 구현 방향은 아래 중 하나가 현실적입니다.

- **A안(범위):** 12개 시주(子~亥)를 모두 넣어 오행점수/부족오행이 어떻게 달라지는지 범위를 반환
- **B안(대표값):** 12개 결과의 중앙값/최빈값을 대표로 보여주고, 변동 폭만 함께 표시

## 2) 달력/절기 기준

현재 `ChartInput`에는 `calendar_type`, `is_leap_month`, `timezone` 필드가 있으나,
**계산 로직에서 사용하지 않습니다.**

- 양력/음력 변환: 미구현
- 윤달 처리: 미구현
- 절기(입춘) 기준 월주: 미구현

현재 월주는 **그레고리력 월(month) 숫자**로만 결정됩니다.

## 3) 월주/일주/년주 산출 방식(현재 구현)

- 년주:
  - 기준년 1984년을 甲子년으로 두고 `(birth_year - 1984) % 60`
- 월주:
  - `month_index = birth_date.month` (1~12)
  - 월지(branch): `BRANCHES[(month_index + 1) % 12]`로 단순 매핑(전통 절기와 다름)
  - 월간(stem): `STEMS[(year_stem_index * 2 + month_index) % 10]`
- 일주:
  - 기준일 1900-01-31을 참조로 하여 `(target - reference).days % 60`
- 시주:
  - `birth_time`이 있을 때만 계산

## 4) 오행 집계 로직(현재 구현)

현재 오행 점수는 다음을 합산합니다.

- 천간 오행: `STEM_WEIGHTS`로 가중치 합산
- 지지(본기) 오행: `BRANCH_WEIGHTS`로 가중치 합산
- 장간(지장간): 지지 가중치의 0.5를 추가로 배분

가중치:

- 천간(Stem)
  - year 1.0, month 1.2, day 1.5, hour 0.8
- 지지(Branch)
  - year 1.0, month 1.4, day 1.2, hour 0.8

정규화:

- `elements_norm`: 전체 점수 대비 백분율(%)로 환산

부족 오행:

- `top_deficiencies`는 `elements_norm` 오름차순 정렬 전체 리스트입니다.
- `main_deficiency = top_deficiencies[0]`

### 합충형파해 / 월령 가중치

- 현재 구현에는 **미반영** 입니다.

## 5) deficiencyLabel(부족오행) ‘화 고정’ 버그 점검 결과

- 동일하게 시간 미상(`birth_time=null`)을 넣어도, 날짜에 따라 부족오행이 달라집니다.
- 예시(코드로 확인):
  - 1990-01-01 → water
  - 1995-04-01 → earth
  - 2000-08-15 → fire
  - 1984-02-02 → metal

즉, **백엔드의 부족오행 계산 자체가 fire로 고정되는 증상은 재현되지 않았습니다.**

다만 프론트에서 ‘항상 화로 보이는’ 현상은 아래 원인 가능성이 큽니다.

- 프론트가 `deficiencyKey`를 계산할 때, 특정 fallback이 `"earth"`로 되어 있음
- 또는 캐시된 결과를 계속 재사용하여 같은 deficiencyLabel이 반복 표출

## 6) 요청하신 동일 입력 raw 결과(/api/analysis)

입력:

- birth_date: 1995-04-01
- gender: M
- calendar_type: SOLAR
- birth_time: null
- timezone: Asia/Seoul

결과 요약:

- chart
  - year: 乙亥
  - month: 庚巳
  - day: 壬午
  - hour: null
- elements_norm
  - wood 12.64
  - fire 37.8
  - earth 3.3
  - metal 15.49
  - water 30.77
- top_deficiencies: [earth, wood, metal, water, fire]
- accuracy_note: 출생시간 미입력으로 시주가 제외되어 분석 정확도가 낮아질 수 있음
