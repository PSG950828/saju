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

type TermModal = {
  title: string;
  subtitle: string;
  summary: string;
  points: string[];
  caution: string;
  example: string;
};

type CardContent = {
  title: string;
  lines: string[];
  bullets?: string[];
};

type Guidance = {
  personality: string[];
  routineIntro: string;
  routines: string[];
  healthIntro: string;
  healthTips: string[];
  healthOutro: string;
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

const defaultForm = {
  name: "",
  birth_date: "1990-05-17",
  birth_time: "09:30",
  gender: "M",
  calendar_type: "SOLAR",
  is_leap_month: false,
  timezone: "Asia/Seoul",
};

const elementLabels: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const focusByElement: Record<string, { primary: string; secondary: string }> = {
  wood: { primary: "집중", secondary: "성과" },
  fire: { primary: "활력", secondary: "관계" },
  earth: { primary: "회복", secondary: "안정" },
  metal: { primary: "정리", secondary: "집중" },
  water: { primary: "유연성", secondary: "회복" },
};

const guidanceByElement: Record<string, Guidance> = {
  wood: {
    personality: ["당신은 추진력과 성장 욕구가 강합니다.", "목 기운은 시작과 확장에 강해요."],
    routineIntro: "오늘은 아이디어를 바로 실행으로 옮기는 루틴이 좋습니다.",
    routines: ["10분 내 실행 1개", "오후 집중 블록 2회"],
    healthIntro: "과로와 긴장을 줄이는 것이 중요합니다.",
    healthTips: ["가벼운 유산소", "목·어깨 스트레칭"],
    healthOutro: "잠들기 전 호흡을 길게 가져가 보세요.",
  },
  fire: {
    personality: ["당신은 표현과 확산이 자연스러운 성향입니다.", "화 기운은 열정과 소통에 강해요."],
    routineIntro: "사람과 연결되는 루틴이 에너지를 올립니다.",
    routines: ["감사 메시지 1개", "짧은 피드백 요청"],
    healthIntro: "수면 리듬과 체열 관리가 핵심입니다.",
    healthTips: ["따뜻한 물 섭취", "저녁 스트레칭"],
    healthOutro: "늦은 시간에는 화면 밝기를 줄여보세요.",
  },
  earth: {
    personality: ["당신은 안정감을 중시하고 실무 감각이 뛰어납니다.", "토 기운은 균형과 정리에 강해요."],
    routineIntro: "오늘은 리듬을 유지하는 루틴이 좋습니다.",
    routines: ["업무 시작 전 정리", "식사 시간 고정"],
    healthIntro: "소화와 컨디션을 일정하게 유지하세요.",
    healthTips: ["따뜻한 식사", "짧은 산책"],
    healthOutro: "과도한 야식을 피하는 게 좋아요.",
  },
  metal: {
    personality: ["당신은 기준과 질서를 중요하게 생각합니다.", "금 기운은 정리와 집중에 강해요."],
    routineIntro: "정리 루틴을 만들면 성과가 올라갑니다.",
    routines: ["오늘 할 일 3개", "마감 체크 5분"],
    healthIntro: "호흡과 근육 긴장을 풀어주세요.",
    healthTips: ["짧은 호흡 정리", "스트레칭"],
    healthOutro: "스트레스를 낮추는 짧은 휴식이 필요해요.",
  },
  water: {
    personality: ["당신은 통찰과 유연함이 강한 편입니다.", "수 기운은 변화 대응에 강해요."],
    routineIntro: "하루의 흐름을 기록하면 안정감이 커집니다.",
    routines: ["마감 전 기록", "중간 점검 1회"],
    healthIntro: "수면과 컨디션을 일정하게 맞추세요.",
    healthTips: ["따뜻한 차", "짧은 낮잠"],
    healthOutro: "마음을 진정시키는 루틴이 필요해요.",
  },
};

const cardLibrary: Record<string, CardContent[]> = {
  안정: [
    {
      title: "안정 / 루틴",
      lines: ["일상 루틴이 흔들리면 에너지가 빠르게 줄어듭니다."],
      bullets: ["수면 시간 고정", "식사 리듬 유지"],
    },
  ],
  활력: [
    {
      title: "활력 / 표현",
      lines: ["표현과 교류가 활력을 끌어올립니다."],
      bullets: ["짧은 통화", "피드백 요청"],
    },
  ],
  관계: [
    {
      title: "관계 / 연결",
      lines: ["혼자보다 함께일 때 에너지가 상승합니다."],
      bullets: ["오늘 대화 1개", "감사 표현 1회"],
    },
  ],
  표현: [
    {
      title: "표현 / 소통",
      lines: ["생각을 표현하는 순간 에너지가 살아납니다."],
      bullets: ["짧은 메시지 1개", "의견 정리 5분"],
    },
  ],
  정리: [
    {
      title: "정리 / 기준",
      lines: ["정리하면 집중력이 상승합니다."],
      bullets: ["책상 정리 5분", "우선순위 3개"],
    },
  ],
  회복: [
    {
      title: "휴식 / 회복",
      lines: ["회복이 충분해야 집중도와 성과가 올라갑니다."],
      bullets: ["눈 감고 3분", "가벼운 스트레칭"],
    },
  ],
  집중: [
    {
      title: "집중 / 몰입",
      lines: ["하나의 일에 몰입할 때 결과가 가장 좋습니다."],
      bullets: ["25분 집중", "5분 정리"],
    },
  ],
  성과: [
    {
      title: "성과 / 실행",
      lines: ["실행을 작게 나누면 성과가 빠르게 쌓입니다."],
      bullets: ["오늘 완료 1개", "내일 계획 1개"],
    },
  ],
  유연성: [
    {
      title: "유연성 / 변화",
      lines: ["상황 변화에 맞게 방향을 조정하는 힘이 중요합니다."],
      bullets: ["여유 시간 확보", "우선순위 3개"],
    },
  ],
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
    highlight: "비견 비중이 높으면 독립성과 주도성이 강한 흐름이 나타납니다.",
    profile: "스스로 결정하고 책임지는 상황에서 에너지가 살아납니다. 혼자서도 안정적으로 움직이는 편입니다.",
    strengths: ["결정이 빠름", "자립적인 실행", "위기에서도 흔들리지 않음"],
    risks: ["의견 충돌", "타협을 늦게 함", "도움 요청을 미룸"],
    relationship: "협업에서도 주도권을 잡는 편이라 역할 분담을 명확히 하면 갈등이 줄어듭니다.",
    moneyWork: "혼자 진행하는 프로젝트나 개인 브랜드에서 성과가 잘 나옵니다.",
    stress: "통제권이 없을 때 스트레스를 크게 느끼며, 혼자 해결하려는 경향이 강해집니다.",
    growth: "협업 시 ‘합의 기준’을 먼저 정하면 에너지가 덜 소모됩니다.",
    action: "오늘 중요한 결정 1개를 스스로 정하고, 공유가 필요한 부분만 체크리스트로 합의해보세요.",
  },
  겁재: {
    highlight: "겁재 비중이 높으면 도전과 추진의 에너지가 강하게 드러납니다.",
    profile: "새로운 시도를 즐기며 승부욕이 강한 편입니다. 속도가 빠르지만 리듬 조절이 필요합니다.",
    strengths: ["도전 정신", "추진력", "빠른 반응"],
    risks: ["무리한 결정", "속도 과다", "계획 누락"],
    relationship: "직선적인 표현이 많아 오해가 생기기 쉬우니 상황 설명을 덧붙이면 좋습니다.",
    moneyWork: "성과를 빠르게 내는 작업에 강하지만, 리스크 관리를 같이 해야 안정적입니다.",
    stress: "속도가 막히면 답답함을 크게 느끼며 즉흥적인 선택이 늘어납니다.",
    growth: "속도보다 ‘안정 기준’을 먼저 정하면 장기적으로 성과가 커집니다.",
    action: "오늘 결정할 일에 대해 리스크 2가지를 적고 시작해보세요.",
  },
  식신: {
    highlight: "식신 비중이 높으면 표현과 활동성이 자연스럽게 강조됩니다.",
    profile: "몸으로 움직이고 말로 표현할 때 에너지가 살아나는 타입입니다.",
    strengths: ["표현력", "활동성", "친화력"],
    risks: ["일 과다", "에너지 소진", "일정 과포화"],
    relationship: "사람들과 자연스럽게 어울리지만, 감정 표현이 강할 때 과열될 수 있습니다.",
    moneyWork: "기획/콘텐츠/서비스처럼 ‘보이는 결과’를 만드는 일에 강합니다.",
    stress: "활동량이 줄어들면 무기력감이 커질 수 있습니다.",
    growth: "활동과 휴식을 함께 설계하면 지속력이 높아집니다.",
    action: "오늘 전달하고 싶은 메시지 1개를 정해서 표현해보세요.",
  },
  상관: {
    highlight: "상관 비중이 높으면 창의적 돌파 성향이 강하게 나타납니다.",
    profile: "새로운 방식을 찾아내는 데 능하며 규칙을 넘어서는 시도가 많습니다.",
    strengths: ["창의적 사고", "돌파력", "문제 해결 능력"],
    risks: ["충동적 결정", "규칙 무시", "마무리 느슨"],
    relationship: "직설적인 의견이 많아 조율이 필요합니다. 기준을 공유하면 협업이 부드러워집니다.",
    moneyWork: "새로운 시도를 하는 업무에 강하지만, 완성도를 관리해야 합니다.",
    stress: "제약이 많을수록 스트레스를 크게 느낍니다.",
    growth: "아이디어를 실행 전 ‘필요성’ 기준으로 필터링하면 성과가 높아집니다.",
    action: "오늘 아이디어 1개를 선택해 실행 기준을 3줄로 적어보세요.",
  },
  "편재": {
    highlight: "편재 비중이 높으면 ‘활동형 재물’ 흐름이 강합니다.",
    profile: "움직이며 수익을 만드는 스타일이라 기회 포착이 빠릅니다.",
    strengths: ["사업 감각", "기회 포착", "빠른 회전"],
    risks: ["수입 변동", "지출 과다", "계획 부족"],
    relationship: "사람을 넓게 만나며 정보 교류를 활발히 합니다.",
    moneyWork: "영업/프로젝트/사업형 업무에서 성과가 좋습니다.",
    stress: "성과가 즉시 보이지 않으면 불안감이 커집니다.",
    growth: "수입과 지출의 리듬을 기록하면 안정감이 올라갑니다.",
    action: "오늘 수입/지출 1건씩 기록해 흐름을 확인해보세요.",
  },
  정재: {
    highlight: "정재 비중이 높으면 안정적이고 축적형 재물 성향이 강합니다.",
    profile: "계획적으로 쌓아가는 스타일이며 안정성을 중시합니다.",
    strengths: ["계획성", "지속력", "안정 추구"],
    risks: ["기회 놓침", "변화 회피", "속도 부족"],
    relationship: "신뢰 기반 관계를 선호하며 약속을 잘 지키는 편입니다.",
    moneyWork: "장기 프로젝트, 안정적인 직무에서 성과가 잘 나옵니다.",
    stress: "예상 밖 변수가 생기면 불안감을 크게 느낍니다.",
    growth: "작은 도전 계획을 섞으면 성장 속도가 빨라집니다.",
    action: "오늘의 지출/저축을 3줄로 정리해보세요.",
  },
  "편관(칠살)": {
    highlight: "편관(칠살) 비중이 높으면 결단력과 긴장감이 강하게 나타납니다.",
    profile: "위기 대응이 빠르고 승부를 걸 때 에너지가 상승합니다.",
    strengths: ["결단력", "위기 대응", "승부욕"],
    risks: ["피로 누적", "과열", "휴식 부족"],
    relationship: "직접적인 표현이 많아 강하게 느껴질 수 있습니다.",
    moneyWork: "성과 압박이 큰 업무에서 집중력이 강합니다.",
    stress: "압박이 클수록 빠른 결정을 반복해 피로가 쌓입니다.",
    growth: "결정 전에 1단계 점검을 넣으면 안정성이 높아집니다.",
    action: "오늘 중요한 결정을 하나 골라 24시간 숙고 규칙을 적용해보세요.",
  },
  정관: {
    highlight: "정관 비중이 높으면 책임과 신뢰의 성향이 강하게 나타납니다.",
    profile: "규칙을 지키며 안정적인 흐름을 만드는 데 능합니다.",
    strengths: ["책임감", "규칙 준수", "신뢰 확보"],
    risks: ["완벽주의", "자기검열", "속도 저하"],
    relationship: "약속을 중시하며 안정적인 관계를 선호합니다.",
    moneyWork: "정해진 프로세스를 지키는 업무에서 성과가 안정적으로 나옵니다.",
    stress: "기준이 흔들리면 불안이 커집니다.",
    growth: "완벽보다 ‘충분히 좋은 기준’을 세우면 에너지 소모가 줄어듭니다.",
    action: "오늘 기준을 하나 정하고, 80%만 채워도 완료로 처리해보세요.",
  },
  편인: {
    highlight: "편인 비중이 높으면 직관과 분석력이 강하게 나타납니다.",
    profile: "깊게 생각하고 통찰하는 능력이 뛰어나며 분석을 즐깁니다.",
    strengths: ["분석력", "통찰", "깊은 사고"],
    risks: ["실행 지연", "과도한 고민", "결정 피로"],
    relationship: "거리감을 유지하며 관찰하는 편이라 솔직한 표현이 필요합니다.",
    moneyWork: "리서치, 분석, 기획 등 깊이 있는 업무에 강합니다.",
    stress: "생각이 많아질수록 피로가 누적됩니다.",
    growth: "생각을 행동으로 옮기는 작은 단계가 필요합니다.",
    action: "생각 중인 아이디어를 1단계 행동으로 쪼개보세요.",
  },
  정인: {
    highlight: "정인 비중이 높으면 보호와 학습 성향이 강하게 나타납니다.",
    profile: "안정과 배움을 중시하며 안전한 환경에서 에너지가 살아납니다.",
    strengths: ["학습력", "배려", "안정성"],
    risks: ["변화 회피", "소극적 선택", "속도 저하"],
    relationship: "상대의 감정을 잘 읽고 배려하지만, 표현은 조심스러운 편입니다.",
    moneyWork: "지속적으로 쌓아가는 업무에서 성과가 잘 나옵니다.",
    stress: "불확실성이 커지면 소극적으로 변할 수 있습니다.",
    growth: "새로운 경험을 작은 단위로 넣어 변화 감각을 키우는 게 좋습니다.",
    action: "오늘은 새로운 정보를 1개만 더 공부해보세요.",
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
  const [lastRequestUrl, setLastRequestUrl] = useState<string | null>(null);
  const [lastRequestAt, setLastRequestAt] = useState<string | null>(null);
  const [lastRequestTimeoutMs, setLastRequestTimeoutMs] = useState<number | null>(null);
  const [lastErrorName, setLastErrorName] = useState<string | null>(null);
  const [unknownTime, setUnknownTime] = useState(false);
  const [original, setOriginal] = useState<OriginalResponse | null>(null);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"analysis" | "glossary">("analysis");
  const [activeTenGod, setActiveTenGod] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const apiBaseFromEnv = process.env.NEXT_PUBLIC_API_BASE;
  const isProd = process.env.NODE_ENV === "production";
  const apiBase = apiBaseFromEnv ?? (isProd ? "" : "http://localhost:8000");

  const showDebug =
    !isProd ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");

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
      return;
    }

    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

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
  const tenGodTags = dayStem
    ? Array.from(
        new Set(pillarStems.map((stem) => getTenGod(dayStem, stem)))
      ).map((term) => {
        const base = tenGodEducation.find((item) => item.term === term);
        const count = tenGodCounts[term] ?? 0;
        const counts = Object.values(tenGodCounts);
        const maxCount = counts.length ? Math.max(...counts) : count;
        const minCount = counts.length ? Math.min(...counts) : count;
        const strength =
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
  const primaryTenGod = Object.entries(tenGodCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];
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
          <input
            type="time"
            value={form.birth_time}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handleChange("birth_time", event.target.value)
            }
            disabled={unknownTime}
          />
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
            <button
              type="button"
              className={`tab ${activeView === "glossary" ? "active" : ""}`}
              onClick={() => setActiveView("glossary")}
            >
              용어 사전
            </button>
          </div>

          {activeView === "analysis" && (
            <>
              <div className="report-header">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="profile">◎</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {original?.name ?? "이름 미입력"}
                    </div>
                    <div style={{ fontSize: 13, color: "#636e72" }}>
                      {original?.birth_date ?? "YYYY年 MM月 DD日"} ·{" "}
                      {original?.birth_time ?? "時柱未詳"}
                    </div>
                  </div>
                </div>
                <button type="button" className="tab">
                  i
                </button>
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

              <div className="element-chips">
                <span className="element-chip">목 {elementCounts.wood}</span>
                <span className="element-chip">화 {elementCounts.fire}</span>
                <span className="element-chip">토 {elementCounts.earth}</span>
                <span className="element-chip">금 {elementCounts.metal}</span>
                <span className="element-chip">수 {elementCounts.water}</span>
              </div>
              <div className="balance-text">⚖ 균형 상태: {balanceHint}</div>

              {primaryTenGod && (
                <div className="summary-focus">현재 핵심 기운: {primaryTenGod}</div>
              )}

              <div className="term-tags">
                {tenGodTags.map((term) => (
                  <button
                    key={term.term}
                    type="button"
                    className={`term-tag ${
                      selectedTenGod === term.term ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveTenGod(term.term);
                      setIsModalOpen(true);
                    }}
                  >
                    {term.term}
                    {term.subtitle ? ` (${term.subtitle})` : ""}
                    <span className={`strength-chip ${term.strength}`}>
                      {term.strengthLabel}
                    </span>
                  </button>
                ))}
              </div>

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
                  {[
                    { age: "0~9세", pillar: "甲子", active: false, note: "기반을 다지는 시기" },
                    { age: "10~19세", pillar: "乙丑", active: false, note: "탐색과 경험 축적" },
                    { age: "20~29세", pillar: "丙寅", active: true, note: "성장과 확장이 두드러짐" },
                    { age: "30~39세", pillar: "丁卯", active: false, note: "안정과 기반 형성" },
                    { age: "40~49세", pillar: "戊辰", active: false, note: "내실을 다지는 시기" },
                  ].map((item) => (
                    <div
                      key={item.age}
                      className={`luck-card ${item.active ? "active" : ""}`}
                    >
                      <div className="pillar-meta">{item.age}</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{item.pillar}</div>
                      <div className="pillar-meta">{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeView === "glossary" && (
            <section className="card-grid" style={{ marginTop: 12 }}>
              {tenGodEducation.map((term) => {
                const detail = tenGodDetails[term.term];
                if (!detail) return null;
                return (
                  <article key={term.term} className="card">
                    <h3>
                      {term.term} ({term.subtitle})
                    </h3>
                    <p>{detail.highlight}</p>
                    <p>{detail.profile}</p>
                    <ul>
                      {detail.strengths.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                    <p>관리 포인트: {detail.risks.join(" / ")}</p>
                    <p>관계: {detail.relationship}</p>
                    <p>돈/일: {detail.moneyWork}</p>
                    <p>스트레스 반응: {detail.stress}</p>
                    <p>성장 전략: {detail.growth}</p>
                    <p>오늘 행동: {detail.action}</p>
                  </article>
                );
              })}
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
            </section>
          )}
        </section>
      )}

      {isModalOpen && selectedTenGodDetail && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="십성 상세"
            ref={modalRef}
            tabIndex={-1}
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
                onClick={() => setIsModalOpen(false)}
              >
                ✕ 닫기
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-highlight">{tenGodInsight}</div>
              <p>{selectedTenGodDetail.profile}</p>
              <div>
                <strong>강점</strong>
                <ul>
                  {selectedTenGodDetail.strengths.map((point) => (
                    <li key={point}>✔ {point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>리스크 / 관리 포인트</strong>
                <ul>
                  {selectedTenGodDetail.risks.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
              <p>대인관계 스타일: {selectedTenGodDetail.relationship}</p>
              <p>돈 / 일 패턴: {selectedTenGodDetail.moneyWork}</p>
              <p>스트레스 반응: {selectedTenGodDetail.stress}</p>
              <p>성장 전략: {selectedTenGodDetail.growth}</p>
              <p>즉시 실행 행동: {selectedTenGodDetail.action}</p>
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
