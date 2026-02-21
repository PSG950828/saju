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

type TenGodStrength = "strong" | "normal" | "weak";

type TenGodTag = {
  term: string;
  subtitle: string;
  strength: TenGodStrength;
  strengthLabel: "강함" | "보통" | "약함";
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
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [selectedLuckAge, setSelectedLuckAge] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const termsSectionRef = useRef<HTMLElement | null>(null);

  const openTenGodModal = (term: string) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setActiveTenGod(term);
    setIsModalOpen(true);
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

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = "Dream Insight · 사주 결과";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // 사용자가 공유를 취소한 경우 등은 무시
    }

    try {
      await navigator.clipboard.writeText(url);
      setToastMessage("링크를 복사했어요.");
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

  const buildStoryLines = (
    summary: AnalysisResponse["summary"],
    personalitySeed: string | null,
    primary: string | null,
    deficiencyKey: string | null
  ): string[] => {
    const deficiencyLabel = deficiencyKey ? elementLabels[deficiencyKey] : null;

    const primaryLine = primary ? `현재 핵심 기운은 ${primary}입니다.` : "";
    const balanceLine = deficiencyLabel
      ? `균형을 위해서는 ‘${deficiencyLabel}’ 기운을 조금 더 보완하는 흐름이 좋아요.`
      : "오행의 균형을 조금만 조절하면 컨디션과 선택이 더 안정됩니다.";

    const moneySeed = summary?.money_work ? summary.money_work : "";
    const relSeed = summary?.relationships ? summary.relationships : "";
    const healthSeed = summary?.health ? summary.health : "";

    return [
      "어릴 때는 크게 튀기보다 상황을 읽고 자신의 기준을 만들려는 쪽에 가까웠을 가능성이 큽니다.",
      personalitySeed
        ? `성향으로 보면, ${personalitySeed.replace(/\.$/, "")} 쪽으로 자연스럽게 흐릅니다.`
        : "성향으로 보면, ‘기준을 세운 뒤 움직이는 타입’에 가깝습니다.",
      primaryLine,
      moneySeed
        ? `일과 돈의 흐름은 ${moneySeed.replace(/\.$/, "")} 쪽에서 힌트를 얻을 수 있어요.`
        : "일과 돈은 ‘지속 가능한 루틴’에서 성과가 쌓입니다.",
      relSeed
        ? `관계에서는 ${relSeed.replace(/\.$/, "")} 점이 반복 패턴이 되기 쉬워요.`
        : "관계에서는 솔직함과 거리 조절의 균형이 핵심입니다.",
      healthSeed
        ? `컨디션은 ${healthSeed.replace(/\.$/, "")} 부분을 먼저 다듬으면 좋아요.`
        : "컨디션은 수면 리듬과 회복 루틴이 키입니다.",
      balanceLine,
      "지금은 ‘완벽한 답’보다 작은 실행으로 방향을 확인할 때 흐름이 더 빨라집니다.",
    ].filter(Boolean);
  };

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
                    onClick={() => setStoryExpanded((prev) => !prev)}
                    aria-expanded={storyExpanded}
                  >
                    {storyExpanded ? "접기" : "자세히 보기"}
                  </button>
                </div>

                <div className="story-body">
                  {buildStoryLines(
                    result.summary,
                    personalityLines?.[0] ?? null,
                    primaryTenGod ?? null,
                    result.element_score?.top_deficiencies?.[0] ?? null
                  )
                    .slice(0, storyExpanded ? 999 : 8)
                    .map((line) => (
                      <p key={line}>{line}</p>
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

      <footer>
        <p>1단계 서비스 · 카드형 결과 · 실행 루틴 · 주간 리포트 안내</p>
      </footer>
    </main>
  );
}
