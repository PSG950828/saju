"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type AnalysisResponse = {
  chart: {
    year_pillar: { stem: string; branch: string };
    month_pillar: { stem: string; branch: string };
    day_pillar: { stem: string; branch: string };
    hour_pillar?: { stem: string; branch: string } | null;
  };
  element_score: {
    elements_raw: Record<string, number>;
    elements_norm: Record<string, number>;
    status: Record<string, string>;
    top_deficiencies: string[];
  };
  summary: Record<string, string>;
  routines: Record<string, string[]>;
  accuracy_note?: string | null;
};

type FormState = {
  name: string;
  gender: "M" | "F";
  birth_date: string;
  birth_time: string; // 24h HH:MM
  birth_time_meridiem: "AM" | "PM";
  birth_time_hh: string; // 01-12
  birth_time_mm: string; // 00-59
  calendar_type: "SOLAR" | "LUNAR";
};

type OriginalResponse = {
  title: string;
  name: string;
  birth_date: string;
  birth_time: string;
  pillars: Record<
    "hour" | "day" | "month" | "year",
    | {
        stem: string;
        branch: string;
        stem_element: string;
        branch_element: string;
      }
    | null
  >;
};

type StoryPayload = {
  v: 2;
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  currentAge: number | null;
  primaryTenGod: string;
  deficiencyKey: string;
  summaryOverall: string;
};

type CardContent = {
  title: string;
  lines: string[];
  bullets?: string[];
};

type TenGodDetail = {
  highlight: string;
  profile: string;
  strengths: string[];
  risks: string[];
  relationship: string;
  moneyWork: string;
  stress: string;
  growth: string;
  action: string;
};

type TenGodTag = {
  term: string;
  subtitle: string;
  strength: "strong" | "normal" | "weak";
  strengthLabel: string;
};

type TenGodStrength = TenGodTag["strength"];

const defaultForm: FormState = {
  name: "",
  gender: "M",
  birth_date: "",
  birth_time: "",
  birth_time_meridiem: "AM",
  birth_time_hh: "",
  birth_time_mm: "",
  calendar_type: "SOLAR",
};

const termDictionary = [
  {
    title: "송백목",
    subtitle: "소나무처럼 단단하고 꾸준한 성향",
    description: "큰 나무의 기운을 가진 유형입니다. 꾸준함, 책임감, 인내력이 강한 성향입니다.",
    points: ["장기 목표에 강함", "안정적인 리더형", "쉽게 흔들리지 않음"],
    caution: "고집이 강해 보일 수 있고 변화에 느릴 수 있습니다.",
    example: "한 번 시작한 일을 끝까지 밀고 가는 힘이 강합니다.",
  },
  {
    title: "비견",
    subtitle: "독립적 · 경쟁형 성향",
    description: "나와 같은 기운을 의미합니다. 자립심과 경쟁심이 강한 유형입니다.",
    points: ["독립적 성향", "자기 주장 뚜렷", "혼자서도 잘하는 편"],
    caution: "협업 시 충돌 가능, 고집이 강해질 수 있습니다.",
    example: "내 방식이 강할 때는 합의 체크리스트를 만들어보세요.",
  },
  {
    title: "편재",
    subtitle: "활동을 통해 돈을 버는 유형",
    description: "활동을 통해 재물을 얻는 성향입니다.",
    points: ["사업 감각", "영업/투자 적성", "기회 포착 능력"],
    caution: "돈의 흐름이 불안정할 수 있고 소비가 커질 수 있습니다.",
    example: "수입·지출 기록을 주 1회 정리하면 안정감이 높아집니다.",
  },
  {
    title: "납음",
    subtitle: "오행의 결을 더 세분화한 이름",
    description: "같은 오행이라도 성향의 결을 조금 더 세밀하게 설명하는 이름입니다.",
    points: ["세부 성향 이해", "기운의 결 표현", "상징적 이미지 활용"],
    caution: "기본 오행 해석이 우선입니다.",
    example: "나무 기운도 ‘송백목’처럼 결이 다르게 표현될 수 있어요.",
  },
];

const elementLabels: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const guidanceByElement: Record<
  string,
  {
    personality: string[];
    routineIntro: string;
    routines: string[];
    healthIntro: string;
    health: string[];
    healthTips: string[];
    todayIntro: string;
    todays: CardContent[];
  }
> = {
  wood: {
    personality: ["성장은 빠른데, 마음은 섬세한 편이에요.", "새로운 걸 시작할 때 에너지 상승폭이 큽니다."],
    routineIntro: "목 기운이 약할 때는 ‘시작’의 힘이 조금 늦게 붙을 수 있어요.",
    routines: ["하루 10분 걷기", "아침에 할 일 1개만 먼저 확정"],
    healthIntro: "몸은 ‘긴장’부터 먼저 반응할 수 있어요.",
    health: ["목/어깨 스트레칭 3분", "수분 섭취 체크"],
  healthTips: ["몸을 풀면 마음도 풀려요.", "무리한 속도보다 꾸준함이 이깁니다."],
    todayIntro: "오늘은 ‘작게 시작하고 끝내기’가 제일 중요합니다.",
    todays: [
      { title: "시작", lines: ["미루던 1개를 10분만 손대보세요."], bullets: ["10분 타이머", "끝나면 체크"] },
    ],
  },
  fire: {
    personality: ["기분과 에너지의 파도가 있는 편이에요.", "사람/분위기에 반응이 빠릅니다."],
    routineIntro: "화 기운이 약할 때는 ‘의욕’이 들쑥날쑥해질 수 있어요.",
    routines: ["햇빛 5분", "따뜻한 물 한 잔"],
    healthIntro: "과열되면 잠/호흡이 먼저 흔들릴 수 있어요.",
    health: ["호흡 2분", "카페인 컷오프 시간 정하기"],
  healthTips: ["흥분을 낮추면 판단이 선명해져요.", "잠을 지키면 운이 덜 새요."],
    todayIntro: "오늘은 ‘컨디션을 끌어올리는 스위치’를 먼저 켜요.",
    todays: [
      { title: "컨디션", lines: ["짧게라도 몸을 데우면 리듬이 빨리 돌아옵니다."], bullets: ["가벼운 스트레칭", "따뜻한 샤워"] },
    ],
  },
  earth: {
    personality: ["안정이 있어야 집중이 잡히는 편이에요.", "사람과 일에서 ‘기준’이 중요합니다."],
    routineIntro: "토 기운이 약할 때는 중심이 흔들리며 불안이 커질 수 있어요.",
    routines: ["책상 정리 5분", "우선순위 3개만 남기기"],
    healthIntro: "소화/피로처럼 ‘기본 리듬’에서 신호가 올 수 있어요.",
    health: ["식사 시간 고정", "가벼운 산책 10분"],
  healthTips: ["기본 리듬이 무너지면 모든 게 거칠어져요.", "작은 정리가 큰 회복입니다."],
    todayIntro: "오늘은 ‘정리’가 곧 회복입니다.",
    todays: [
      { title: "정리", lines: ["지금 필요한 것만 남기면 마음이 편해져요."], bullets: ["5분 정리", "메모 3줄"] },
    ],
  },
  metal: {
    personality: ["결정이 선명할수록 더 편해져요.", "애매함이 길어지면 피로가 빨리 옵니다."],
    routineIntro: "금 기운이 약할 때는 ‘결단’이 미뤄지며 스트레스가 쌓일 수 있어요.",
    routines: ["결정 1개를 오늘 확정", "거절 문장 1개 준비"],
    healthIntro: "긴장이 오래 가면 근육/호흡이 굳을 수 있어요.",
    health: ["어깨·목 풀기", "잠들기 전 화면 10분 컷"],
  healthTips: ["긴장을 풀어야 말이 부드러워져요.", "결정을 미루면 피로가 쌓여요."],
    todayIntro: "오늘은 ‘선택지를 줄이는’ 쪽이 결과가 좋아요.",
    todays: [
      { title: "결정", lines: ["미정인 1개를 ‘한다/안 한다’로 갈라보세요."], bullets: ["결정 1개", "공유 1회"] },
    ],
  },
  water: {
    personality: ["생각이 깊고, 한 번 빠지면 몰입이 강해요.", "혼자 정리하는 시간이 필요합니다."],
    routineIntro: "수 기운이 약할 때는 ‘회복’이 늦어지며 집중이 떨어질 수 있어요.",
    routines: ["낮잠 15분 또는 눈 감기 3분", "산책하며 생각 정리"],
    healthIntro: "과로하면 수면의 질부터 먼저 흔들릴 수 있어요.",
    health: ["수면 시간 고정", "따뜻한 차 1잔"],
  healthTips: ["회복이 먼저면 일은 따라옵니다.", "과로 신호를 작게라도 잡아주세요."],
    todayIntro: "오늘은 ‘회복을 먼저’ 잡아야 일이 풀립니다.",
    todays: [
      { title: "회복", lines: ["쉬는 시간이 죄책감이 아니라 전략이 됩니다."], bullets: ["눈 감기 3분", "가벼운 스트레칭"] },
    ],
  },
};

const focusByElement: Record<string, { primary: string; secondary: string }> = {
  wood: { primary: "시작", secondary: "집중" },
  fire: { primary: "표현", secondary: "성과" },
  earth: { primary: "정리", secondary: "회복" },
  metal: { primary: "정리", secondary: "집중" },
  water: { primary: "회복", secondary: "유연성" },
};

const cardLibrary: Record<string, CardContent[]> = {
  관계: [
    {
      title: "관계 / 연결",
      lines: ["한 번의 대화가 흐름을 바꿉니다.", "짧게라도 진심을 남겨보세요."],
      bullets: ["오늘 대화 1개", "감사 표현 1회"],
    },
  ],
  시작: [
    {
      title: "시작 / 첫 발",
      lines: ["처음 10분이 제일 어렵고, 그 다음은 쉬워져요."],
      bullets: ["10분 타이머", "끝나면 체크"],
    },
  ],
  표현: [
    {
      title: "표현 / 소통",
      lines: ["생각을 ‘밖으로’ 꺼낼 때 막힌 게 풀립니다."],
      bullets: ["짧은 메시지 1개", "의견 정리 5분"],
    },
  ],
  정리: [
    {
      title: "정리 / 기준",
      lines: ["정리하면 마음이 가벼워지고 집중이 돌아옵니다."],
      bullets: ["책상 정리 5분", "우선순위 3개"],
    },
  ],
  회복: [
    {
      title: "휴식 / 회복",
      lines: ["회복이 충분해야 말도 부드러워지고 판단이 정확해져요."],
      bullets: ["눈 감고 3분", "가벼운 스트레칭"],
    },
  ],
  집중: [
    {
      title: "집중 / 몰입",
      lines: ["한 번에 하나만 잡으면 속도가 붙습니다."],
      bullets: ["25분 집중", "5분 정리"],
    },
  ],
  성과: [
    {
      title: "성과 / 실행",
      lines: ["실행을 작게 나누면 결과가 빨리 쌓입니다."],
      bullets: ["오늘 완료 1개", "내일 계획 1개"],
    },
  ],
  유연성: [
    {
      title: "유연성 / 변화",
      lines: ["상황이 바뀌면 방향을 ‘조금’ 조정하는 힘이 중요합니다."],
      bullets: ["여유 시간 확보", "우선순위 3개"],
    },
  ],
};

const tenGodEducation = [
  { stem: "甲", term: "비견", subtitle: "독립적 · 경쟁형 성향" },
  { stem: "乙", term: "겁재", subtitle: "도전적 · 추진형 성향" },
  { stem: "丙", term: "식신", subtitle: "표현 · 활동형 성향" },
  { stem: "丁", term: "상관", subtitle: "창의 · 돌파형 성향" },
  { stem: "戊", term: "편재", subtitle: "활동형 재물 성향" },
  { stem: "己", term: "정재", subtitle: "성실 · 축적형 성향" },
  { stem: "庚", term: "편관(칠살)", subtitle: "도전 · 결단형 성향" },
  { stem: "辛", term: "정관", subtitle: "책임 · 안정형 성향" },
  { stem: "壬", term: "편인", subtitle: "직관 · 분석형 성향" },
  { stem: "癸", term: "정인", subtitle: "보호 · 학습형 성향" },
];

const tenGodDetails: Record<string, TenGodDetail> = {
  비견: {
    highlight: "주도권을 잡을 때 성과가 빠르게 나는 ‘독립형 추진’ 타입.",
    profile: "스스로 정하고 책임질 때 집중력이 올라갑니다.",
    strengths: ["결정 속도", "자립 실행", "위기 대응"],
    risks: ["고집/충돌", "협의 지연", "도움 요청 미룸"],
    relationship: "역할·권한이 명확하면 협업이 매끄럽습니다.",
    moneyWork: "개인 프로젝트/프리랜스 성격의 일에서 성과가 잘 납니다.",
    stress: "통제권이 줄면 예민해지고 ‘혼자 해결’로 고립되기 쉽습니다.",
    growth: "합의 기준(결정권/마감/품질)을 먼저 박아두면 에너지 소모가 줄어요.",
    action: "오늘 결정 1개를 먼저 확정 → 공유가 필요한 항목만 3줄로 합의하세요.",
  },
  겁재: {
    highlight: "승부·도전의 압력을 ‘가속’으로 바꾸는 돌파형.",
    profile: "속도가 빠르고 경쟁 상황에서 퍼포먼스가 올라갑니다.",
    strengths: ["도전 드라이브", "추진 속도", "즉시 대응"],
    risks: ["무리수", "계획 생략", "과열/피로"],
    relationship: "직설적이라 오해가 나기 쉬워 ‘의도’를 한 줄 덧붙이면 좋아요.",
    moneyWork: "단기 성과·런칭·영업형 과제에 강하지만 리스크 체크가 필수입니다.",
    stress: "막히면 즉흥 결정을 늘려 손실을 키우기 쉽습니다.",
    growth: "시작 전에 ‘중단 기준/예산/마감’ 3가지만 고정하세요.",
    action: "오늘 하는 일에 리스크 2개 + 중단 기준 1개를 먼저 적고 시작하세요.",
  },
  식신: {
    highlight: "움직이고 표현할수록 운이 트이는 ‘실행·표현형’.",
    profile: "행동과 표현이 곧 에너지입니다.",
    strengths: ["표현력", "실행력", "분위기 메이킹"],
    risks: ["과다 일정", "피로 누적", "집중 분산"],
    relationship: "친화적이지만 감정이 과열되면 말이 앞서기 쉽습니다.",
    moneyWork: "콘텐츠/서비스처럼 결과물이 보이는 일에서 강합니다.",
    stress: "멈추면 무기력, 과하게 달리면 번아웃으로 나타납니다.",
    growth: "일정에 ‘휴식 슬롯’을 고정하면 지속력이 확 올라가요.",
    action: "오늘 전달할 메시지 1개를 정해 ‘짧게’ 표현하세요.",
  },
  상관: {
    highlight: "규칙을 깨서 길을 여는 ‘창의적 돌파’ 타입.",
    profile: "새 방식을 설계하고 막힌 문제를 푸는 데 강합니다.",
    strengths: ["아이디어", "돌파", "문제 해결"],
    risks: ["충동","마무리 약함","규칙 충돌"],
    relationship: "직설적이어서, 기준(목표/우선순위)을 공유하면 갈등이 줄어요.",
    moneyWork: "신규 기획·개선·실험 과제에 강하지만 마감/품질 관리가 필요합니다.",
    stress: "제약이 많아질수록 반발심·평가 민감도가 올라갑니다.",
    growth: "아이디어는 실행 전에 ‘필요/효과/비용’ 3항목으로 필터링하세요.",
    action: "오늘 아이디어 1개만 뽑아 실행 기준을 3줄로 적으세요.",
  },
  "편재": {
    highlight: "기회를 잡아 ‘현금흐름’으로 바꾸는 활동형 재물.",
    profile: "사람·정보·현장을 움직일수록 수익 기회가 열립니다.",
    strengths: ["기회 포착", "영업 감각", "회전력"],
    risks: ["수입 변동", "지출 확대", "기록 부재"],
    relationship: "네트워크를 넓히고 정보 교류가 활발합니다.",
    moneyWork: "영업/프로젝트/사업형 업무에서 성과가 빠릅니다.",
    stress: "성과가 안 보이면 불안해져 지출로 풀기 쉽습니다.",
    growth: "수입·지출을 ‘주 1회’만이라도 고정 기록하세요.",
    action: "오늘 수입/지출 1건씩만 기록해 흐름을 잡으세요.",
  },
  정재: {
    highlight: "꾸준히 쌓아 ‘안정 자산’을 만드는 축적형 재물.",
    profile: "계획·관리·루틴에서 힘이 납니다.",
    strengths: ["계획성", "지속력", "리스크 최소화"],
    risks: ["기회 회피", "변화 둔감", "속도 느림"],
    relationship: "신뢰 기반, 약속을 잘 지키는 편입니다.",
    moneyWork: "장기 프로젝트·운영/관리형 업무에서 강합니다.",
    stress: "변수가 생기면 불안이 커져 과잉 통제로 가기 쉽습니다.",
    growth: "작은 도전을 ‘주 단위’로 1개씩 넣어 탄력성을 키우세요.",
    action: "오늘 지출/저축을 3줄로만 정리해 기준을 만드세요.",
  },
  "편관(칠살)": {
    highlight: "압박에서 강해지는 ‘결단·승부’ 타입.",
    profile: "위기 상황에서 집중력과 결단이 올라갑니다.",
    strengths: ["결단", "위기 대응", "성과 집착"],
    risks: ["과열", "피로 누적", "휴식 부족"],
    relationship: "강하게 말해 상대가 압박을 느낄 수 있어 톤 조절이 필요합니다.",
    moneyWork: "성과 압박이 큰 업무에서 집중력이 좋습니다.",
    stress: "압박이 커질수록 ‘속결’이 늘어 실수가 나기 쉽습니다.",
    growth: "결정 전에 10분 점검(리스크/대안/마감)을 넣어 안정화하세요.",
    action: "오늘 큰 결정 1개는 ‘10분 점검’ 후 실행하세요.",
  },
  정관: {
    highlight: "질서와 신뢰로 결과를 만드는 ‘책임·안정’ 타입.",
    profile: "규칙/프로세스가 있을 때 성과가 안정적입니다.",
    strengths: ["책임감", "신뢰", "프로세스 운영"],
    risks: ["완벽주의", "자기검열", "속도 저하"],
    relationship: "약속을 중시하고 안정적인 관계를 선호합니다.",
    moneyWork: "규정/품질/리스크 관리가 필요한 일에서 강합니다.",
    stress: "기준이 흔들리면 불안이 커지고 통제 욕구가 올라갑니다.",
    growth: "‘충분히 좋은 기준(80%)’을 정해 반복 실행하세요.",
    action: "오늘 기준 1개를 정하고 80%면 완료로 처리하세요.",
  },
  편인: {
    highlight: "통찰로 방향을 잡는 ‘직관·분석’ 타입.",
    profile: "깊게 파고들수록 판단 품질이 올라갑니다.",
    strengths: ["분석", "통찰", "전략 사고"],
    risks: ["실행 지연", "과잉 고민", "결정 피로"],
    relationship: "관찰형이라 감정을 표현하지 않으면 거리감이 생깁니다.",
    moneyWork: "리서치/분석/전략 기획에서 강합니다.",
    stress: "생각이 과열되면 수면·집중이 무너집니다.",
    growth: "결정은 ‘작은 실험’으로 바꾸면 실행이 쉬워져요.",
    action: "아이디어를 ‘첫 행동 1개’로 쪼개 오늘 실행하세요.",
  },
  정인: {
    highlight: "안정과 학습으로 기반을 만드는 ‘보호·축적’ 타입.",
    profile: "안전한 환경에서 집중력이 올라갑니다.",
    strengths: ["학습", "배려", "안정 운영"],
    risks: ["변화 회피", "소극성", "속도 저하"],
    relationship: "배려가 강하지만 표현이 조심스러워 오해가 나기 쉽습니다.",
    moneyWork: "지속적으로 쌓아가는 업무(교육/운영/지원)에 강합니다.",
    stress: "불확실성이 커지면 움츠러들고 선택이 느려집니다.",
    growth: "새 경험을 ‘작은 단위’로 넣어 변화 근육을 키우세요.",
    action: "오늘 새 정보를 1개만 학습하고 메모 3줄로 정리하세요.",
  },
};

const STEM_ELEMENT: Record<string, "wood" | "fire" | "earth" | "metal" | "water"> = {
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
};

const STEM_POLARITY: Record<string, "yang" | "yin"> = {
  "甲": "yang",
  "乙": "yin",
  "丙": "yang",
  "丁": "yin",
  "戊": "yang",
  "己": "yin",
  "庚": "yang",
  "辛": "yin",
  "壬": "yang",
  "癸": "yin",
};

const GENERATES: Record<"wood" | "fire" | "earth" | "metal" | "water",
  "wood" | "fire" | "earth" | "metal" | "water"> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<"wood" | "fire" | "earth" | "metal" | "water",
  "wood" | "fire" | "earth" | "metal" | "water"> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

const getTenGod = (dayStem: string, otherStem: string) => {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[otherStem];

  if (dayElement === otherElement) {
    return samePolarity ? "비견" : "겁재";
  }

  if (GENERATES[dayElement] === otherElement) {
    return samePolarity ? "식신" : "상관";
  }

  if (CONTROLS[dayElement] === otherElement) {
    return samePolarity ? "정재" : "편재";
  }

  if (CONTROLS[otherElement] === dayElement) {
    return samePolarity ? "정관" : "편관(칠살)";
  }

  return samePolarity ? "정인" : "편인";
};

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRequestUrl, setLastRequestUrl] = useState<string | null>(null);
  const [lastRequestAt, setLastRequestAt] = useState<string | null>(null);
  const [lastRequestTimeoutMs, setLastRequestTimeoutMs] = useState<number | null>(null);
  const [lastErrorName, setLastErrorName] = useState<string | null>(null);
  const [unknownTime, setUnknownTime] = useState(false);
  const [original, setOriginal] = useState<OriginalResponse | null>(null);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"analysis" | "terms">("analysis");
  const [activeTenGod, setActiveTenGod] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyLines, setStoryLines] = useState<string[] | null>(null);
  const [selectedLuckAge, setSelectedLuckAge] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const storyModalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const termsSectionRef = useRef<HTMLElement | null>(null);

  const openTenGodModal = (term: string) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setActiveTenGod(term);
    setIsModalOpen(true);
  };

  const openStoryModal = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setStoryModalOpen(true);
  };

  const closeTenGodModal = () => {
    setIsModalOpen(false);
  };

  const formatBirthInfo = () => {
    const date = original?.birth_date ?? "생년월일 미상";
    const timeRaw = original?.birth_time;
    const time = !timeRaw || timeRaw === "" ? "출생시간 미상" : timeRaw;
    const genderLabel = form.gender === "M" ? "남" : form.gender === "F" ? "여" : "-";
    return `${date} · ${genderLabel} · ${time}`;
  };

  const getStoryCacheKey = (payload: StoryPayload) => {
    // 개인정보를 그대로 키로 쓰지 않기 위해(노출 최소화) 짧은 해시를 만들어 사용
    // 암호학적 해시는 아니지만, “동일 입력 → 동일 키”를 안정적으로 만족합니다.
    const raw = JSON.stringify(payload);
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `story:v3:${(hash >>> 0).toString(16)}`;
  };

  const generateStory = (params: {
    name: string;
    primaryTenGod: string | null;
    deficiencyLabel: string | null;
    summary: AnalysisResponse["summary"];
    personalitySeed: string | null;
    currentAge: number | null;
  }): string[] => {
    const rawName = (params.name || "당신").trim();
    const safeName = rawName.length > 0 ? rawName : "당신";

    // 한국어 조사 자동 처리(을/를, 이/가, 은/는, 와/과)
    // - “화을(를)”처럼 잘못된 표기를 원천 차단합니다.
    const lastHangulChar = (s: string) => {
      for (let i = s.length - 1; i >= 0; i -= 1) {
        const ch = s[i];
        if (/[가-힣]/.test(ch)) return ch;
      }
      return null;
    };

    const hasFinalConsonant = (hangulChar: string) => {
      const code = hangulChar.charCodeAt(0);
      const base = 0xac00;
      const offset = code - base;
      if (offset < 0 || offset > 11171) return false;
      return offset % 28 !== 0;
    };

    const josa = (word: string, pair: "을를" | "이가" | "은는" | "와과") => {
      const hangul = lastHangulChar(word);
      const 받침 = hangul ? hasFinalConsonant(hangul) : false;
      if (pair === "을를") return 받침 ? "을" : "를";
      if (pair === "이가") return 받침 ? "이" : "가";
      if (pair === "은는") return 받침 ? "은" : "는";
      return 받침 ? "과" : "와";
    };

    const primary = params.primaryTenGod;
    const def = params.deficiencyLabel;
    const age = params.currentAge;

    const rel = params.summary?.relationships ? params.summary.relationships.replace(/\.$/, "") : null;
    const money = params.summary?.money_work ? params.summary.money_work.replace(/\.$/, "") : null;
    const health = params.summary?.health ? params.summary.health.replace(/\.$/, "") : null;
    const persona = params.personalitySeed ? params.personalitySeed.replace(/\.$/, "") : null;

    const ageBandLabel = (() => {
      if (age == null) return "지금";
      if (age < 10) return "0~9세";
      if (age < 20) return "10대";
      if (age < 30) return "20대";
      if (age < 40) return "30대";
      if (age < 50) return "40대";
      if (age < 60) return "50대";
      return "60대 이후";
    })();

    const clamp = (s: string, max = 44) => {
      const t = s.trim();
      if (t.length <= max) return t;
      return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
    };

    const normalize = (s: string) =>
      s
        .replace(/\s+/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim();

    // ❌ 금지/회피 표현들(너무 일반적인 심리/모호한 조언/가능성/설명체 톤)
    // - 완벽 차단보다는 “서사 톤 유지”를 목표로 강한 중화/제거를 합니다.
    const redactBannedPhrases = (line: string) => {
      let s = normalize(line);

      // 가능성/애매함 줄이기
      s = s
        .replace(/(일\s*수\s*있(어요|습니다)|가능(성)?이\s*있(어요|습니다))/g, "입니다")
        .replace(/(같(아요|습니다)|듯(해요|합니다))/g, "합니다")
        .replace(/(아마|어쩌면|대체로|보통은|누구나|사람은\s*다)/g, "");

      // 너무 일반적인 조언 문구(문장 전체면 제거)
      if (
        /^(충분히|꾸준히|열심히|너무\s*걱정\s*말고|스스로를\s*믿고|자기계발|긍정)/.test(s)
      ) {
        return "";
      }

      // 설명체/정의문처럼 들리는 표현 약화
      s = s.replace(/~?입니다\s*$/g, (m) => m);

      return s.trim();
    };

    const withPeriod = (s: string) => {
      const t = s.trim();
      if (t === "") return t;
      if (/[.!?…]$/.test(t)) return t;
      return `${t}.`;
    };

    const pick = (s: string | null) => (s ? clamp(s.replace(/\.$/, "")) : null);
    const relHint = pick(rel);
    const moneyHint = pick(money);
    const healthHint = pick(health);
    const personaHint = pick(persona);

    const jobStyle = primary
      ? [
          `‘${primary}’이(가) 앞에 서 있을 때는, 남이 정해준 역할보다 내가 설계한 방식이 더 잘 맞습니다.`,
          "일은 ‘결정권’이 있는 자리에서 속도가 붙고, 결정권이 없는 환경에서는 피로가 먼저 쌓여요.",
        ]
      : [
          "일은 단번에 뛰어들기보다, 조건을 정리하고 들어갈 때 안정적으로 길게 갑니다.",
          "조직 안에서도 ‘내 기준’을 세울 수 있는 팀/포지션이 잘 맞아요.",
        ];

    const jobRole = (() => {
      if (!def) return "기획·운영·분석·콘텐츠 정리처럼, 구조를 만들고 유지하는 일";
      if (def.includes("목")) return "기획·전략·브랜딩처럼, 방향을 세우고 ‘시작’을 여는 일";
      if (def.includes("화")) return "콘텐츠·마케팅·영업처럼, 설득과 확산이 필요한 일";
      if (def.includes("토")) return "운영·관리·프로덕트처럼, 안정과 지속을 만드는 일";
      if (def.includes("금")) return "품질·감사·법무/컴플라이언스처럼, 기준과 선을 지키는 일";
      if (def.includes("수")) return "리서치·데이터·상담/코칭처럼, 흐름을 읽고 해석하는 일";
      return "구조를 만들고 유지하는 일";
    })();

    const moneyStyle = (() => {
      if (moneyHint) return [withPeriod(moneyHint), "돈은 ‘한 번에 크게’보다 ‘흐름을 끊기지 않게’가 핵심이에요."];
      return [
        "수입은 한 방보다 반복으로 쌓이는 쪽이 마음을 편하게 합니다.",
        "단기 수익을 좇을수록 리듬이 깨지기 쉬워서, ‘작은 실험 + 손실 제한’이 잘 맞아요.",
      ];
    })();

    const lossPattern = [
      "손실은 실력이 부족해서라기보다, 기준이 흐려지는 순간에 생깁니다.",
      "기회가 커 보일수록 ‘내가 잃을 수 있는 한도’부터 먼저 정해야 해요.",
      "유동 자산은 기동성을 주고, 실물 자산은 마음을 안정시키니 둘을 섞되 비율을 고정하는 편이 좋아요.",
    ];

    const marriageFlow = (() => {
      const base = [
        "연애나 결혼은 속도가 아니라 ‘대화의 안전’으로 결정됩니다.",
        "말을 예쁘게 하는 사람보다, 말이 꼬였을 때 다시 푸는 사람이 오래가요.",
        "배우자는 기세가 센 사람보다, 생활 감각이 있고 약속을 지키는 사람이 맞습니다.",
        "결혼 후에는 ‘내가 혼자 책임지는 습관’을 내려놓는 순간 관계가 편해져요.",
      ];
      if (relHint) base.splice(1, 0, `관계의 반복 장면은 “${withPeriod(relHint)}” 쪽으로 자주 열릴 거예요.`);
      return base;
    })();

    const familyFlow = [
      "자녀/가족을 대할 때는 훈계보다 ‘규칙을 함께 세우는 방식’이 잘 먹힙니다.",
      "엄하게 보이더라도, 사실은 지켜주고 싶어서 기준을 세우는 쪽에 가깝습니다.",
      "부모 역할은 ‘다 해주는 사람’이 아니라, ‘스스로 하게 만드는 사람’으로 남아요.",
    ];

    const realEstateFlow = [
      "재산과 부동산은 화려한 타이밍보다, 컨디션과 생활 리듬이 안정되는 시점에 힘이 붙습니다.",
      "이동이 잦은 시기에는 유동성을, 정착이 필요한 시기에는 생활권을 먼저 잡는 게 손실을 줄여요.",
      `집은 투자이기도 하지만, ${safeName}님에게는 ‘마음을 눕히는 자리’이기도 합니다.`,
    ];

    const stressFlow = (() => {
      const base = [
        "압박이 커지면 표정은 조용해지는데, 속은 더 빨라집니다.",
        "그때 가장 위험한 건 감정이 아니라, ‘혼자 떠안는 습관’이에요.",
        "회복은 마음을 달래는 말보다, 수면/식사/호흡 같은 기본 리듬을 되돌리는 게 빠릅니다.",
      ];
      if (healthHint) base.splice(2, 0, `몸의 신호는 “${withPeriod(healthHint)}” 쪽에서 먼저 올라옵니다.`);
      return base;
    })();

    const futureFlow40 = [
      "40대 이후는 ‘확장’보다 ‘선택’이 힘이 됩니다.",
      "무엇을 더 하느냐보다, 무엇을 줄였을 때 에너지가 살아나는지 알게 돼요.",
      ...jobStyle,
      "이때는 조직형/독립형 중 하나로 크게 갈리기보다, ‘결정권이 있는 자리’로 이동하는 게 핵심이 됩니다.",
      "돈도 비슷해요. 공격보다 방어가 앞서야, 결과가 길게 남습니다.",
    ];

    const roleAfter50 = [
      "50대 이후는 사건보다 역할의 변화가 더 크게 느껴질 거예요.",
      "내가 직접 뛰는 시간에서, 사람과 구조를 움직이는 시간으로 무게중심이 옮겨갑니다.",
      "가르치거나 설계하거나, 운영하고 정리하는 쪽에서 이름이 남는 흐름이 들어와요.",
      "그래서 후반에는 ‘내 경험을 타인이 쓰게 만드는 정리’가 가장 값집니다.",
    ];

    const nowBand = [
      `그리고 지금, ${ageBandLabel}의 중심에 서 있습니다.`,
      "여기서부터는 운이 아니라 선택의 축이 바뀝니다.",
      "이제는 ‘더 하는 사람’보다 ‘덜 소모하는 사람’이 오래 갑니다.",
      personaHint
        ? `${safeName}님을 한 줄로 붙잡으면, “${withPeriod(personaHint)}” 같은 결이에요.`
        : "겉은 차분해도, 속은 단번에 본질을 잡아내는 편입니다.",
      primary
        ? `요즘 ‘${primary}’이(가) 전면에 서 있어서, 애매한 말과 애매한 약속이 더 힘들게 느껴져요.`
        : "요즘은 바깥의 평가보다 안쪽의 기준을 다시 세우는 쪽으로 마음이 갑니다.",
      "관계에서는 한 문장만 더 붙이면 오해가 줄고, 대화의 온도가 달라집니다.",
      relHint
        ? `특히 관계는 “${withPeriod(relHint)}” 장면이 반복되기 쉬우니, ‘기준’을 먼저 공유하는 편이 좋아요.`
        : "관계는 맞다/틀리다보다, 안전하게 말할 수 있느냐가 오래 가는 기준이 됩니다.",
      "일은 지금이 ‘커리어를 정리하는 시기’가 아니라, ‘커리어를 다시 배치하는 시기’예요.",
      `맞는 직무 결은 ${jobRole} 쪽으로 잡히고, 그 일을 할 때 컨디션이 먼저 살아납니다.`,
      ...moneyStyle,
      ...lossPattern,
      ...stressFlow,
      def
        ? `${safeName}님은 지금 ${def} 기운을 보완하는 습관이 인생 전체를 덜 흔들리게 잡아줍니다.`
        : "지금은 작은 루틴 하나가, 생각보다 큰 변화를 만들어냅니다.",
    ];

  const lines: string[] = [];

    // 서사 시작(제목 없이)
    lines.push(`${safeName}님 이야기는 ‘성격’에서 끝나지 않아요.`);
    lines.push("삶이 어떻게 흘러왔는지, 그리고 어디서 방향이 바뀌는지부터 잡아볼게요.");
    lines.push("장면을 따라가다 보면 직업, 돈, 관계, 가족, 재산까지 연결이 보입니다.");

    // 1) 어린 시절
    lines.push("");
    lines.push("어린 시절(0~12세)");
    lines.push("어릴 때는 앞에 나서기보다, 주변을 조용히 읽는 시간이 길었을 거예요.");
    lines.push("눈치가 빠르다는 말보다, ‘분위기를 먼저 느끼는 아이’에 가까웠습니다.");
    lines.push("그래서 보호받을 때도 있었고, 혼자 버틴 날도 있었겠죠.");
    lines.push("그 시절에 만들어진 기준이, 나중에 돈을 쓰는 방식과 사람을 고르는 방식까지 이어집니다.");

    // 2) 10대
    lines.push("");
    lines.push("10대(정체성 형성)");
    lines.push("10대에는 남들이 말하는 ‘정답’이 부담으로 느껴졌을 수 있어요.");
    lines.push("그래서 더 조용히, 더 정확히 보려고 했습니다.");
    lines.push("누구와 붙어 있을 때 숨이 쉬어지는지, 어떤 말이 나를 무너뜨리는지.");
    lines.push("그걸 알아내는 시기였고, 그 경험이 이후 연애나 결혼 선택에도 영향을 줍니다.");

    // 3) 20대
    lines.push("");
    lines.push("20대(사회 진입 / 방향 탐색)");
    lines.push("20대는 사회의 속도를 처음으로 몸으로 맞는 구간이에요.");
    lines.push("처음엔 뭐든 할 수 있을 것 같다가도, 어느 순간 ‘내 방식’이 필요해집니다.");
  lines.push("그때부터는 남의 이름이 아니라, 내 이름으로 책임을 지는 경험이 늘어납니다.");
    lines.push("일은 여기서 방향을 틀기 시작해요. ‘좋아 보이는 일’보다 ‘내가 오래 버티는 일’을 찾게 됩니다.");
    lines.push(`그때 맞는 결은 ${jobRole}처럼, 구조를 만들고 쌓아가는 쪽이에요.`);
    lines.push("돈도 비슷합니다. 급하게 벌면 급하게 빠져나가고, 흐름을 만들면 남습니다.");
    lines.push("이 시기에 생긴 소비/투자 습관이, 30대의 재산 흐름을 결정해요.");

    // 4) 30대
    lines.push("");
    lines.push("30대(책임 / 구조 형성)");
    lines.push("30대는 책임이 ‘일’에서 ‘생활’로 번져갑니다.");
    lines.push("관계도 일이 되고, 일이 관계가 되는 장면이 늘어요.");
  lines.push(`${safeName}님은 여기서 사람을 넓히기보다, 사람을 정리하는 쪽으로 마음이 움직였을 거예요.`);
    lines.push("결혼이나 동거 같은 선택도 이 시기에 ‘조건’이 아니라 ‘리듬’으로 판단하게 됩니다.");
    lines.push("같이 있을 때 편해지는 사람, 약속을 지키는 사람, 말이 꼬였을 때 다시 푸는 사람.");
    lines.push("그게 배우자 운의 핵심이고, 그 기준이 안 서면 관계는 오래 버티기 힘들어요.");
    lines.push("재산도 마찬가지입니다. 이때부터는 실물/유동의 비율을 고정하는 순간 안정감이 생겨요.");

    // 5) 현재
    lines.push("");
    lines.push("현재 시기(핵심 변화 포인트)");
    nowBand.forEach((l) => lines.push(l));

  // ✔ 반드시 들어가야 하는 현실 항목(요구 강제)
  lines.push("");
  lines.push("직업 방향 / 관계 유형 / 선택 방식");
  lines.push(`직업은 ${jobRole}처럼, 성과보다 구조가 남는 쪽으로 잡아야 길이 열립니다.`);
  lines.push("관계는 감정의 크기보다 약속의 밀도가 기준이 되고, 그 기준이 서면 사람이 남습니다.");
  lines.push("선택은 ‘더 좋은 것’이 아니라 ‘더 덜 소모되는 것’을 고르는 쪽이 정답에 가깝습니다.");

  lines.push("");
  lines.push("실패 패턴 / 성공 조건 / 미래 변화");
  lines.push("실패는 능력 부족이 아니라, 기준이 흐려질 때(돈/관계/시간) 동시에 터지는 패턴으로 옵니다.");
  lines.push("성공은 속도가 아니라 반복입니다. 작게 해도 끊기지 않는 루틴이 결국 결과를 만들어요.");
  lines.push("미래 변화는 ‘환경이 바뀌는 것’보다 ‘내 역할이 바뀌는 것’으로 크게 옵니다.");
    lines.push("");
    lines.push("결혼 / 배우자 흐름");
    marriageFlow.forEach((l) => lines.push(l));
    lines.push("");
    lines.push("자식 / 가족");
    familyFlow.forEach((l) => lines.push(l));
    lines.push("");
    lines.push("부동산 / 재산 흐름");
    realEstateFlow.forEach((l) => lines.push(l));

    // 6) 40대 이후
    lines.push("");
    lines.push("40대 이후 흐름");
    futureFlow40.forEach((l) => lines.push(l));

    // 7) 50대 이후
    lines.push("");
    lines.push("50대 이후 역할 변화");
    roleAfter50.forEach((l) => lines.push(l));

    // 8) 인생 전체 핵심 메시지(1문장)
    lines.push("");
    lines.push("인생 전체 핵심 메시지");
    const finalLine = def
      ? `${safeName}님 인생은 ${def}${josa(def, "을를")} 채우는 작은 습관 하나가, 직업과 돈과 사랑의 큰 선택을 흔들리지 않게 붙잡아줍니다.`
      : `${safeName}님 인생은 기준이 선명해지는 순간마다, 직업과 돈과 사랑이 한꺼번에 정렬됩니다.`;
    lines.push(finalLine);

    // 라인 후처리(이름 치환 잔재 방지 + 연속 중복 제거)
    const cleaned = lines
      .map((line) => line.replace(/\$\{name\}/g, safeName))
      .map((line) => redactBannedPhrases(line))
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== "");

    const deduped: string[] = [];
    for (const line of cleaned) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev === line) continue;
      deduped.push(line);
    }

    // 최소 40줄 보장(부족하면 현재 파트의 문장 몇 개를 추가)
    if (deduped.length < 40) {
      const filler = [
        "지금은 선택이 늦어지는 게 문제가 아니라, 선택의 기준이 흔들리는 게 문제예요.",
        "기준이 서면 속도가 붙고, 속도가 붙으면 돈과 관계의 소모가 줄어듭니다.",
        "그래서 오늘은 ‘내가 지킬 한 가지’부터 정하는 게 가장 현실적인 시작입니다.",
      ];
      for (const f of filler) {
        if (deduped.length >= 40) break;
        deduped.splice(Math.min(deduped.length, 22), 0, f);
      }
    }

    return deduped;
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = "Dream Insight · 사주 결과";

    const storyPreview = storyLines
      ? storyLines
          .filter((line) => line.trim() !== "" && !line.startsWith("["))
          .slice(0, 2)
          .join(" ")
      : "";

    const shareText = `${title}\n${formatBirthInfo()}\n\n${
      result?.summary?.overall ?? ""
    }${storyPreview ? `\n\n${storyPreview}` : ""}\n\n${url}`.trim();

    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
        return;
      }
    } catch {
      // 사용자가 공유를 취소한 경우 등은 무시
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setToastMessage("요약 + 링크를 복사했어요.");
      window.setTimeout(() => setToastMessage(null), 1700);
    } catch {
      setToastMessage("복사에 실패했어요. 주소창 링크를 사용해 주세요.");
      window.setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleReInput = () => {
    setResult(null);
    setOriginal(null);
    setError(null);
    setOriginalError(null);
    setActiveTenGod(null);
    setStoryLines(null);
    closeStoryModal();
    closeTenGodModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToAllTerms = () => {
    setActiveView("terms");
    window.requestAnimationFrame(() => {
      termsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const apiBaseFromEnv = process.env.NEXT_PUBLIC_API_BASE;
  const isProd = process.env.NODE_ENV === "production";
  const apiBase = apiBaseFromEnv ?? (isProd ? "" : "http://localhost:8000");

  const showDebug =
    !isProd ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");

  const closeStoryModal = () => setStoryModalOpen(false);

  const fetchWithTimeout = async (
    input: RequestInfo,
    init: RequestInit,
    timeoutMs = 10000
  ) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const beginRequestTrace = (url: string, timeoutMs: number) => {
    setLastRequestUrl(url);
    setLastRequestTimeoutMs(timeoutMs);
    setLastRequestAt(new Date().toISOString());
    setLastErrorName(null);
  };

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const to24h = (meridiem: "AM" | "PM", hh: string, mm: string) => {
    if (!hh || !mm) return "";
    const h = Number.parseInt(hh, 10);
    const m = Number.parseInt(mm, 10);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
    if (h < 1 || h > 12 || m < 0 || m > 59) return "";
    let hour24 = h % 12;
    if (meridiem === "PM") hour24 += 12;
    return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (unknownTime) {
      if (form.birth_time !== "") {
        setForm((prev) => ({ ...prev, birth_time: "" }));
      }
      return;
    }
    const next = to24h(form.birth_time_meridiem, form.birth_time_hh, form.birth_time_mm);
    if (!next) {
      if (form.birth_time !== "") {
        setForm((prev) => ({ ...prev, birth_time: "" }));
      }
      return;
    }
    if (next !== form.birth_time) setForm((prev) => ({ ...prev, birth_time: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.birth_time_meridiem, form.birth_time_hh, form.birth_time_mm, unknownTime]);

  const handleOriginal = async () => {
    setOriginalLoading(true);
    setOriginalError(null);
    setLastErrorName(null);

    if (!apiBase) {
      setOriginalError(
        "배포 설정이 아직 반영되지 않았어요. 잠시 후 새로고침하거나, 운영 환경변수(NEXT_PUBLIC_API_BASE)와 재배포 상태를 확인해 주세요."
      );
      setOriginalLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        birth_time: unknownTime ? null : form.birth_time,
      };

      const url = `${apiBase}/api/original`;
      const timeoutMs = 20000;
      beginRequestTrace(url, timeoutMs);

      const response = await fetchWithTimeout(
        url,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        },
        timeoutMs
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "요청 실패");
      }

      const data = (await response.json()) as OriginalResponse;
      setOriginal(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setLastErrorName(err.name);
        setOriginalError("서버 응답이 지연되고 있어요. 백엔드 실행 상태를 확인해 주세요.");
      } else {
        setLastErrorName(err instanceof Error ? err.name : "UnknownError");
        setOriginalError(err instanceof Error ? err.message : "알 수 없는 오류");
      }
    } finally {
      setOriginalLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLastErrorName(null);
    setResult(null);

    if (!apiBase) {
      setError(
        "배포 설정이 아직 반영되지 않았어요. 잠시 후 새로고침하거나, 운영 환경변수(NEXT_PUBLIC_API_BASE)와 재배포 상태를 확인해 주세요."
      );
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...form,
        birth_time: unknownTime ? null : form.birth_time,
      };

      const url = `${apiBase}/api/analysis`;
      const timeoutMs = 30000;
      beginRequestTrace(url, timeoutMs);

      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        timeoutMs
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "요청 실패");
      }

      const data = (await response.json()) as AnalysisResponse;
      setResult(data);
      setActiveView("analysis");
      await handleOriginal();
    } catch (err) {
      if (err instanceof TypeError) {
        setLastErrorName(err.name);
        setError(
          `네트워크 오류로 요청이 실패했어요. (API: ${apiBase}) 운영 백엔드 접근/도메인 설정을 확인해 주세요.`
        );
        return;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        setLastErrorName(err.name);
        setError("서버 응답이 지연되고 있어요. 백엔드 실행 상태를 확인해 주세요.");
      } else {
        setLastErrorName(err instanceof Error ? err.name : "UnknownError");
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      document.body.style.overflow = "";
      lastFocusedElementRef.current?.focus?.();
      return;
    }

    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTenGodModal();
        return;
      }

      if (event.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));

      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === root) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!storyModalOpen) {
      document.body.style.overflow = "";
      lastFocusedElementRef.current?.focus?.();
      return;
    }

    document.body.style.overflow = "hidden";
    storyModalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeStoryModal();
        return;
      }

      if (event.key !== "Tab") return;
      const root = storyModalRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));

      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === root) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [storyModalOpen]);

  const deficiencyKey = result?.element_score.top_deficiencies[0] ?? "earth";
  const guidance = guidanceByElement[deficiencyKey] ?? guidanceByElement.earth;
  const deficiencyLabel = elementLabels[deficiencyKey] ?? "-";
  const displayName = original?.name ?? "당신";
  const personalityLines = guidance.personality.map((line, index) =>
    index === 0 ? line.replace("당신은", `${displayName}님은`) : line
  );
  const focus = focusByElement[deficiencyKey] ?? focusByElement.earth;
  const dynamicCards = [
    ...(cardLibrary[focus.primary] ?? []),
    ...(cardLibrary[focus.secondary] ?? []),
  ];
  const totalRaw = result
    ? (Object.values(result.element_score.elements_raw) as number[]).reduce(
        (sum, value) => sum + value,
        0
      )
    : 0;
  const toCount = (value: number) =>
    totalRaw ? Math.max(0, Math.round((value / totalRaw) * 10)) : 0;
  const elementCounts = result
    ? {
        wood: toCount(result.element_score.elements_raw.wood),
        fire: toCount(result.element_score.elements_raw.fire),
        earth: toCount(result.element_score.elements_raw.earth),
        metal: toCount(result.element_score.elements_raw.metal),
        water: toCount(result.element_score.elements_raw.water),
      }
    : { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const deficiencyLabels = result
    ? result.element_score.top_deficiencies
        .slice(0, 3)
        .map((item) => elementLabels[item] ?? item)
    : [deficiencyLabel];
  const balanceHint = `${deficiencyLabels.join("·")} 기운 보완 필요`;

  const birthYear = (() => {
    const raw = original?.birth_date;
    if (!raw) return null;
    const year = Number(raw.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  })();
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : null;

  const luckSegments = [
    {
      age: "0~9세",
      start: 0,
      end: 9,
      pillar: "甲子",
      note: "기반을 다지는 시기",
      story:
        "환경의 영향을 크게 받는 시기입니다. 안정감과 루틴이 만들어지면 이후 선택이 흔들리지 않아요.",
    },
    {
      age: "10~19세",
      start: 10,
      end: 19,
      pillar: "乙丑",
      note: "탐색과 경험 축적",
      story:
        "관심사가 넓어지고 ‘나만의 기준’을 만들기 시작합니다. 비교보다 경험을 쌓을수록 강점이 선명해집니다.",
    },
    {
      age: "20~29세",
      start: 20,
      end: 29,
      pillar: "丙寅",
      note: "성장과 확장이 두드러짐",
      story:
        "속도와 확장이 함께 들어오는 구간입니다. 기회를 좇되, 마감/컨디션 기준을 고정하면 성과가 커집니다.",
    },
    {
      age: "30~39세",
      start: 30,
      end: 39,
      pillar: "丁卯",
      note: "안정과 기반 형성",
      story:
        "역량을 ‘구조’로 바꾸는 시기입니다. 루틴, 관계, 돈의 흐름을 정리해두면 불필요한 소모가 크게 줄어요.",
    },
    {
      age: "40~49세",
      start: 40,
      end: 49,
      pillar: "戊辰",
      note: "내실을 다지는 시기",
      story:
        "확장보다 내실에 강점이 생깁니다. 선택의 폭을 줄이고, ‘잘하는 것’에 집중할수록 안정성이 올라갑니다.",
    },
  ] as const;

  const inferActiveLuckAge = () => {
    if (currentAge == null) return luckSegments[2].age;
    const found = luckSegments.find((seg) => currentAge >= seg.start && currentAge <= seg.end);
    return found?.age ?? luckSegments[luckSegments.length - 1].age;
  };

  const activeLuckAge = inferActiveLuckAge();

  useEffect(() => {
    if (!result) return;
    setSelectedLuckAge((prev) => prev ?? activeLuckAge);
    // result/original이 바뀔 때 1회 기본 선택
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, original]);

  useEffect(() => {
    if (!result) return;

    const deficiencyKeyNow = result.element_score?.top_deficiencies?.[0] ?? "earth";
    const deficiencyLabelNow = elementLabels[deficiencyKeyNow] ?? null;
    const displayNameNow = original?.name ?? (form.name ? form.name : "당신");
    const summaryOverallNow = result.summary?.overall ?? "";
    const primaryTenGodNow = primaryTenGod ?? "";

    const payload: StoryPayload = {
      v: 2,
      name: original?.name ?? form.name ?? "",
      birthDate: original?.birth_date ?? form.birth_date ?? "",
      gender: form.gender ?? "",
      birthTime: original?.birth_time ?? (unknownTime ? "" : form.birth_time) ?? "",
      primaryTenGod: primaryTenGodNow,
      deficiencyKey: deficiencyKeyNow,
      summaryOverall: summaryOverallNow,
      currentAge,
    };

    const key = getStoryCacheKey(payload);
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as { lines: string[] };
        if (Array.isArray(parsed.lines) && parsed.lines.length >= 10) {
          setStoryLines(parsed.lines);
          return;
        }
      }
    } catch {
      // 캐시 불러오기 실패는 무시
    }

    const newLines = generateStory({
      name: displayNameNow,
      primaryTenGod: primaryTenGodNow || null,
      deficiencyLabel: deficiencyLabelNow,
      summary: result.summary,
      personalitySeed: personalityLines?.[0] ?? null,
      currentAge,
    });

    setStoryLines(newLines);
    try {
      window.localStorage.setItem(key, JSON.stringify({ lines: newLines }));
    } catch {
      // 저장 실패는 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, original]);

  const dayStem = original?.pillars.day?.stem;
  const pillarStems = original
    ? [
        original.pillars.hour?.stem,
        original.pillars.day?.stem,
        original.pillars.month?.stem,
        original.pillars.year?.stem,
      ].filter((stem): stem is string => Boolean(stem))
    : [];
  const tenGodCounts = dayStem
    ? pillarStems
        .map((stem) => getTenGod(dayStem, stem))
        .reduce<Record<string, number>>((acc, term) => {
          acc[term] = (acc[term] ?? 0) + 1;
          return acc;
        }, {})
    : {};
  const tenGodTags: TenGodTag[] = dayStem
    ? Array.from(new Set(pillarStems.map((stem) => getTenGod(dayStem, stem))))
        .filter((term) => Boolean(tenGodDetails[term]))
        // 표시 우선순위: 사주 내 빈도 높은 십성 우선
        .sort((a, b) => (tenGodCounts[b] ?? 0) - (tenGodCounts[a] ?? 0))
        .slice(0, 4)
        .map((term) => {
          const base = tenGodEducation.find((item) => item.term === term);
          const count = tenGodCounts[term] ?? 0;
          const counts = Object.values(tenGodCounts);
          const maxCount = counts.length ? Math.max(...counts) : count;
          const minCount = counts.length ? Math.min(...counts) : count;
          const strength: TenGodStrength =
            count === maxCount
              ? "strong"
              : count === minCount || count <= 1
                ? "weak"
                : "normal";
          return {
            term,
            subtitle: base?.subtitle ?? "",
            strength,
            strengthLabel:
              strength === "strong" ? "강함" : strength === "weak" ? "약함" : "보통",
          };
        })
    : [];
  const primaryTenGod = tenGodTags.length
    ? tenGodTags
        .slice()
        .sort(
          (a, b) => (tenGodCounts[b.term] ?? 0) - (tenGodCounts[a.term] ?? 0)
        )[0]?.term
    : null;
  const selectedTenGod = activeTenGod ?? tenGodTags[0]?.term ?? null;
  const selectedTenGodDetail = selectedTenGod
    ? tenGodDetails[selectedTenGod]
    : null;
  const selectedTenGodSubtitle = tenGodTags.find(
    (item) => item.term === selectedTenGod
  )?.subtitle;
  const selectedTenGodCount = selectedTenGod
    ? tenGodCounts[selectedTenGod] ?? 0
    : 0;
  const tenGodInsight = selectedTenGodDetail
    ? selectedTenGodDetail.highlight
    : "";
  const showRecovery =
    result?.element_score.status.water === "LOW" ||
    result?.element_score.status.water === "VERY_LOW" ||
    result?.element_score.status.earth === "LOW" ||
    result?.element_score.status.earth === "VERY_LOW";

  const isLow = (element: string) =>
    result?.element_score.status[element] === "LOW" ||
    result?.element_score.status[element] === "VERY_LOW";
  const isHigh = (element: string) =>
    result?.element_score.status[element] === "HIGH" ||
    result?.element_score.status[element] === "VERY_HIGH";

  const conditionalCards: CardContent[] = [];
  if (isLow("water") || isLow("earth")) {
    conditionalCards.push(...(cardLibrary.회복 ?? []));
  }
  if (isLow("metal")) {
    conditionalCards.push(...(cardLibrary.집중 ?? []));
  }
  if (isHigh("metal")) {
    conditionalCards.push(...(cardLibrary.정리 ?? []));
  }
  if (isLow("fire") || isHigh("fire")) {
    conditionalCards.push(...(cardLibrary.표현 ?? []));
  }
  if (isLow("water") || isHigh("water")) {
    conditionalCards.push(...(cardLibrary.유연성 ?? []));
  }
  const limitedConditionalCards = conditionalCards.slice(0, 3);

  return (
    <main>
      <header>
        <h1>사주 기반 개인 에너지 운영</h1>
        <p>
          사주 분석 결과를 카드형으로 확인하고 오늘의 보정 루틴을 바로 실행하세요.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <label>
          이름
          <input
            type="text"
            placeholder="홍길동"
            value={form.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("name", event.target.value)
            }
          />
        </label>
        <label>
          생년월일
          <input
            type="date"
            value={form.birth_date}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("birth_date", event.target.value)
            }
            required
          />
        </label>
        <label>
          출생시간
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 1fr", gap: 10 }}>
            <select
              value={form.birth_time_meridiem}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleChange("birth_time_meridiem", event.target.value)
              }
              disabled={unknownTime}
              aria-label="오전/오후"
            >
              <option value="AM">오전</option>
              <option value="PM">오후</option>
            </select>

            <input
              inputMode="numeric"
              placeholder="05"
              value={form.birth_time_hh}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "birth_time_hh",
                  event.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                )
              }
              disabled={unknownTime}
              aria-label="시(01~12)"
            />

            <input
              inputMode="numeric"
              placeholder="30"
              value={form.birth_time_mm}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "birth_time_mm",
                  event.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                )
              }
              disabled={unknownTime}
              aria-label="분(00~59)"
            />
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            전송 형식: {form.birth_time || "--:--"}
          </div>
          <div className="badge">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUnknownTime(event.target.checked)
              }
            />
            <span>출생시간 모름</span>
          </div>
        </label>
        <label>
          성별
          <select
            value={form.gender}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              handleChange("gender", event.target.value)
            }
          >
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </label>
        <label>
          캘린더 유형
          <select
            value={form.calendar_type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              handleChange("calendar_type", event.target.value)
            }
          >
            <option value="SOLAR">양력</option>
            <option value="LUNAR">음력</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "분석 중..." : "무료 분석하기"}
        </button>
        <button type="button" onClick={handleOriginal} disabled={originalLoading}>
          {originalLoading ? "원문 생성 중..." : "📜 내 사주 원문 보기"}
        </button>
      </form>

      {showDebug && (
        <section className="notice" style={{ fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>진단</div>
          <div>환경: {process.env.NODE_ENV}</div>
          <div>
            NEXT_PUBLIC_API_BASE: {apiBaseFromEnv ? apiBaseFromEnv : "(없음)"}
          </div>
          <div>사용 API Base: {apiBase ? apiBase : "(비어있음)"}</div>
          <div>
            마지막 요청: {lastRequestUrl ? lastRequestUrl : "(아직 없음)"}
          </div>
          <div>요청 시각: {lastRequestAt ? lastRequestAt : "-"}</div>
          <div>
            타임아웃: {lastRequestTimeoutMs ? `${lastRequestTimeoutMs}ms` : "-"}
          </div>
          <div>마지막 에러명: {lastErrorName ? lastErrorName : "-"}</div>
        </section>
      )}

      {error && <div className="notice">{error}</div>}

      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {!result && (
        <div className="notice">
          정보를 입력한 후 &quot;무료 분석하기&quot; 버튼을 눌러주세요.
        </div>
      )}

      {result && (
        <section className="section">
          <h2>분석 결과</h2>

          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeView === "analysis" ? "active" : ""}`}
              onClick={() => setActiveView("analysis")}
            >
              결과 요약
            </button>
          </div>

          {activeView === "analysis" && (
            <>
              <div className="result-topbar" role="region" aria-label="프로필 요약">
                <div className="result-topbar-left">
                  <div className="result-avatar" aria-hidden="true">
                    ◎
                  </div>
                  <div className="result-topbar-text">
                    <div className="result-name">{original?.name ?? "이름 미입력"}</div>
                    <div className="result-meta">{formatBirthInfo()}</div>
                  </div>
                </div>
                <div className="result-topbar-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleShare}
                    aria-label="결과 공유"
                    title="공유"
                  >
                    공유
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleReInput}
                    aria-label="정보 다시 입력"
                    title="다시 입력"
                  >
                    ↺
                  </button>
                </div>
              </div>

              {originalError && <div className="notice">{originalError}</div>}

              <div className="report-grid">
                {[
                  { label: "時柱 (태어난 시간)", key: "hour" },
                  { label: "日柱 (나 자신)", key: "day" },
                  { label: "月柱 (사회·직업)", key: "month" },
                  { label: "年柱 (가족·배경)", key: "year" },
                ].map((item) => {
                  const pillar = original?.pillars[item.key as keyof OriginalResponse["pillars"]];
                  const isMissing = item.key === "hour" && !pillar;
                  return (
                    <article key={item.label} className="pillar-card">
                      <div className="pillar-meta">{item.label}</div>
                      <div className="pillar-tile">
                        <div
                          className={`pillar-char ${
                            pillar ? `element-${pillar.stem_element}` : "pillars-muted"
                          }`}
                        >
                          {pillar ? pillar.stem : "미상"}
                        </div>
                        <div
                          className={`pillar-char ${
                            pillar ? `element-${pillar.branch_element}` : "pillars-muted"
                          }`}
                        >
                          {pillar ? pillar.branch : "미상"}
                        </div>
                      </div>
                      {isMissing && (
                        <div className="pillar-meta">
                          시간 정보가 없어 시주 해석은 제외됩니다
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="element-balance-row" aria-label="오행과 균형 상태">
                <div className="element-inline" aria-label="오행 카운트">
                  <span>목 {elementCounts.wood}</span>
                  <span className="dot">·</span>
                  <span>화 {elementCounts.fire}</span>
                  <span className="dot">·</span>
                  <span>토 {elementCounts.earth}</span>
                  <span className="dot">·</span>
                  <span>금 {elementCounts.metal}</span>
                  <span className="dot">·</span>
                  <span>수 {elementCounts.water}</span>
                </div>
                <div className="balance-badge" role="status">
                  균형 상태: {balanceHint}
                </div>
              </div>

              {primaryTenGod && (
                <div className="summary-focus">
                  <button
                    type="button"
                    className="focus-link"
                    onClick={() => openTenGodModal(primaryTenGod)}
                  >
                    현재 핵심 기운: {primaryTenGod}
                  </button>
                  <button
                    type="button"
                    className="focus-info"
                    aria-label="현재 핵심 기운 설명 보기"
                    onClick={() => openTenGodModal(primaryTenGod)}
                  >
                    ⓘ
                  </button>
                </div>
              )}

              <div className="ten-god-grid" role="list" aria-label="십성 카드">
                {tenGodTags.map((term) => (
                  <button
                    key={term.term}
                    type="button"
                    role="listitem"
                    className={`ten-god-card ${
                      activeTenGod === term.term ? "selected" : ""
                    }`}
                    onClick={() => openTenGodModal(term.term)}
                  >
                    <div className="ten-god-card-body">
                      <div className="ten-god-line1">
                        <span className="ten-god-name">{term.term}</span>
                        <span className="ten-god-sep">—</span>
                        <span className={`ten-god-strength ${term.strength}`}>
                          {term.strengthLabel}
                        </span>
                      </div>
                      <div
                        className="ten-god-line2"
                        title={term.subtitle}
                      >
                        {term.subtitle}
                      </div>
                    </div>

                    <span className="ten-god-info" aria-hidden="true">
                      ⓘ
                    </span>
                  </button>
                ))}
              </div>

              <section className="story-section" aria-label="당신의 사주 이야기">
                <div className="story-header">
                  <h3>당신의 사주 이야기</h3>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={openStoryModal}
                    aria-label="사주 이야기 전체 보기"
                  >
                    자세히 보기
                  </button>
                </div>

                <div className="story-body">
                  {(storyLines ?? [
                    "사주 이야기를 만드는 중입니다.",
                  ])
                    .filter((line) => Boolean(line))
                    .slice(0, 7)
                    .map((line) => (
                      <p key={line}>{line.replace(/\$\{name\}/g, original?.name ?? form.name ?? "당신")}</p>
                    ))}
                </div>
              </section>

              <section className="guide-grid" aria-label="생활 가이드">
                {(
                  result
                    ? [
                        {
                          title: "핵심 성향",
                          body: personalityLines?.[0]
                            ? `${personalityLines[0]}\n오늘은 강점이 과열되지 않게 ‘속도 조절’만 의식해 보세요.`
                            : "기준을 세운 뒤 움직일 때 성과가 안정적입니다.\n오늘은 우선순위 1개만 확정해보세요.",
                        },
                        {
                          title: "돈 / 일",
                          body: result.summary?.money_work
                            ? `${result.summary.money_work}\n결정 전에 ‘마감·리스크·기대효과’ 3가지만 체크하세요.`
                            : "성과는 루틴에서 커집니다.\n오늘은 완료 1개를 작게 잡아 끝내보세요.",
                        },
                        {
                          title: "관계",
                          body: result.summary?.relationships
                            ? `${result.summary.relationships}\n말하기 전에 의도를 한 줄 덧붙이면 오해가 줄어요.`
                            : "관계는 선명한 기준과 따뜻한 표현이 함께일 때 좋아집니다.\n감사 메시지 1개를 보내보세요.",
                        },
                        {
                          title: "건강 / 컨디션",
                          body: result.summary?.health
                            ? `${result.summary.health}\n짧은 회복 루틴(스트레칭 3분)을 고정해보세요.`
                            : "컨디션은 수면 리듬이 좌우합니다.\n잠들기 30분 전 화면 밝기를 줄여보세요.",
                        },
                        {
                          title: "휴식 / 회복",
                          body: "몰입이 강할수록 회복이 늦어지기 쉽습니다.\n일정에 ‘휴식 슬롯’을 먼저 넣고 나머지를 채워보세요.",
                        },
                        {
                          title: "표현 / 소통",
                          body: "생각을 정리해 짧게 던질 때 기회가 열립니다.\n오늘 핵심 메시지 1개를 2문장으로 정리하세요.",
                        },
                        {
                          title: "유연성 / 변화",
                          body: "변화를 ‘큰 결단’이 아니라 ‘작은 실험’으로 바꾸면 부담이 줄어요.\n오늘 10분짜리 실험을 1개만 해보세요.",
                        },
                      ]
                    : []
                ).map((card) => (
                  <article key={card.title} className="guide-card">
                    <h4>{card.title}</h4>
                    {card.body.split("\n").map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </article>
                ))}
              </section>

              {result.accuracy_note && (
                <div className="notice">{result.accuracy_note}</div>
              )}

              <section className="card-grid" style={{ marginTop: 16 }}>
                <article className="card">
                  <h3>핵심 성향</h3>
                  {personalityLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </article>

                <article className="card">
                  <h3>오늘의 보정 루틴</h3>
                  <p>{guidance.routineIntro}</p>
                  <ul>
                    {guidance.routines.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </article>

                <article className="card">
                  <h3>돈 / 일</h3>
                  <p>{result.summary.money_work}</p>
                </article>

                <article className="card">
                  <h3>관계</h3>
                  <p>{result.summary.relationships}</p>
                </article>

                <article className="card">
                  <h3>건강 / 컨디션</h3>
                  <p>{result.summary.health}</p>
                  <ul>
                    {guidance.healthTips.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </article>

                {limitedConditionalCards.map((card) => (
                  <article key={card.title} className="card">
                    <h3>{card.title}</h3>
                    {card.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {card.bullets && (
                      <ul>
                        {card.bullets.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </section>

              <div className="section">
                <h3>인생 흐름 (10년 단위)</h3>
                <p>
                  각 시기는 약 10년 동안 지속되는 인생의 주요 변화 흐름을 의미합니다.
                  현재 구간은 강조 표시됩니다.
                </p>
                <div className="luck-bar">
                  {luckSegments.map((item) => {
                    const isCurrent = item.age === activeLuckAge;
                    const isSelected = item.age === selectedLuckAge;
                    return (
                      <button
                        key={item.age}
                        type="button"
                        className={`luck-card ${isCurrent ? "active" : ""} ${isSelected ? "selected" : ""}`}
                        onClick={() =>
                          setSelectedLuckAge((prev) => (prev === item.age ? null : item.age))
                        }
                        aria-pressed={isSelected}
                        aria-label={`${item.age} 인생 흐름 보기`}
                      >
                        <div className="pillar-meta">{item.age}</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{item.pillar}</div>
                        <div className="pillar-meta">{item.note}</div>
                      </button>
                    );
                  })}
                </div>

                {selectedLuckAge && (
                  <div className="luck-detail" role="region" aria-label="선택한 시기 해석">
                    {(() => {
                      const seg = luckSegments.find((s) => s.age === selectedLuckAge);
                      if (!seg) return null;
                      return (
                        <>
                          <div className="luck-detail-title">
                            {seg.age} · {seg.note}
                          </div>
                          <div className="luck-detail-body">{seg.story}</div>
                          <div className="luck-detail-foot">
                            {currentAge != null ? (
                              <span>
                                현재 나이 추정: {currentAge}세 (생년 기준)
                              </span>
                            ) : (
                              <span>
                                현재 구간은 생년 정보가 없으면 기본값으로 표시됩니다.
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="section" style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={goToAllTerms}
                >
                  용어 전체 보기
                </button>
              </div>
            </>
          )}

          {activeView === "terms" && (
            <section
              className="section"
              ref={termsSectionRef}
              aria-label="용어 전체 목록"
              style={{ marginTop: 12 }}
            >
              <div className="report-header" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>용어 전체 보기</div>
                  <div style={{ fontSize: 13, color: "#636e72" }}>
                    용어를 클릭하면 설명 모달이 열립니다.
                  </div>
                </div>
                <button
                  type="button"
                  className="tab"
                  onClick={() => setActiveView("analysis")}
                >
                  결과로 돌아가기
                </button>
              </div>

              <div className="card-grid">
                {tenGodEducation
                  .filter((term) => Boolean(tenGodDetails[term.term]))
                  .map((term) => (
                    <button
                      key={term.term}
                      type="button"
                      className="term-card"
                      onClick={() => openTenGodModal(term.term)}
                    >
                      <div className="term-card-title">{term.term}</div>
                      <div className="term-card-subtitle">{term.subtitle}</div>
                      <div className="term-card-cta">설명 보기</div>
                    </button>
                  ))}

                {termDictionary.map((term) => (
                  <article key={term.title} className="card">
                    <h3>
                      {term.title} ({term.subtitle})
                    </h3>
                    <p>{term.description}</p>
                    <ul>
                      {term.points.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                    <p>주의점: {term.caution}</p>
                    <p>생활 예시: {term.example}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

      {isModalOpen && selectedTenGodDetail && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            // 배경 클릭으로 닫히지 않도록 (요구사항)
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="십성 상세"
            ref={modalRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header sticky">
              <div>
                <div className="modal-title">{selectedTenGod}</div>
                <div className="modal-subtitle">
                  {selectedTenGodSubtitle}
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeTenGodModal}
              >
                ✕ 닫기
              </button>
            </div>
            <div className="modal-body">
              <div className="tg-modal-hero">
                <div className="tg-modal-hero-title">한 줄 핵심 요약</div>
                <div className="tg-modal-hero-text">{tenGodInsight}</div>
              </div>

              <div className="tg-modal-traits">
                <div className="tg-modal-section-title">핵심 특성</div>
                <div className="tg-trait-chips" role="list">
                  {(
                    selectedTenGodDetail.strengths
                      .slice(0, 3)
                      .map((text) => text.replace(/^\s*[✔•-]\s*/g, ""))
                  ).map((trait) => (
                    <span key={trait} className="tg-trait-chip" role="listitem">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div className="tg-modal-grid">
                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">강점</div>
                  <ul className="tg-modal-list">
                    {selectedTenGodDetail.strengths.slice(0, 3).map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>

                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">리스크 / 주의점</div>
                  <ul className="tg-modal-list">
                    {selectedTenGodDetail.risks.slice(0, 3).map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>

                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">관계 스타일</div>
                  <div className="tg-modal-card-text">
                    {selectedTenGodDetail.relationship}
                  </div>
                </section>

                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">일 / 돈 패턴</div>
                  <div className="tg-modal-card-text">
                    {selectedTenGodDetail.moneyWork}
                  </div>
                </section>

                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">스트레스 반응</div>
                  <div className="tg-modal-card-text">
                    {selectedTenGodDetail.stress}
                  </div>
                </section>

                <section className="tg-modal-card">
                  <div className="tg-modal-card-title">성장 전략</div>
                  <div className="tg-modal-card-text">
                    {selectedTenGodDetail.growth}
                  </div>
                </section>

                <section className="tg-modal-card tg-modal-action">
                  <div className="tg-modal-card-title">오늘 실행 팁</div>
                  <div className="tg-modal-card-text">
                    {selectedTenGodDetail.action}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {storyModalOpen && storyLines && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            // 배경 클릭으로 닫히지 않도록 (요구사항)
          }}
        >
          <div
            className="modal story-modal"
            role="dialog"
            aria-modal="true"
            aria-label="당신의 사주 이야기"
            tabIndex={-1}
            ref={storyModalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header sticky">
              <div>
                <div className="modal-title">당신의 사주 이야기</div>
                <div className="modal-subtitle">
                  요약이 아니라, {original?.name ?? (form.name ? form.name : "당신")}님의 흐름을 서사로 풀어낸 해석입니다.
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeStoryModal}
              >
                ✕ 닫기
              </button>
            </div>

            <div className="modal-body story-modal-body">
              {storyLines.map((line, idx) =>
                line.trim() === "" ? (
                  <div key={`gap-${idx}`} style={{ height: 10 }} />
                ) : (
                  <p key={`${idx}-${line}`} className={line.startsWith("[") ? "story-h" : "story-p"}>
                    {line}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>1단계 서비스 · 카드형 결과 · 실행 루틴 · 주간 리포트 안내</p>
      </footer>
    </main>
  );
}
