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
  summary: string;
  points: string[];
  caution: string;
  example: string;
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
    summary: "비견은 ‘나와 같은 기운’이라 독립성과 경쟁심이 강해집니다.",
    points: ["독립적 성향", "자기 주장 뚜렷", "혼자서도 잘하는 편"],
    caution: "협업 시 충돌 가능, 고집이 강해질 수 있습니다.",
    example: "업무에서 내 방식이 강할 때, 체크리스트로 합의하면 충돌이 줄어듭니다.",
    action: "오늘은 혼자 집중할 일을 정하고, 협업은 역할을 분리해보세요.",
  },
  겁재: {
    summary: "겁재는 ‘도전과 추진’의 기운이 강하게 나타납니다.",
    points: ["도전적", "즉흥적", "승부욕"],
    caution: "무리한 선택을 하기 쉬워 속도 조절이 필요합니다.",
    example: "새 프로젝트를 시작할 때 일정 여유를 두면 안정성이 올라갑니다.",
    action: "결정을 하기 전 리스크 2가지를 메모해보세요.",
  },
  식신: {
    summary: "식신은 ‘표현과 활동’의 기운이 자연스럽게 드러납니다.",
    points: ["표현력", "활동성", "친화력"],
    caution: "일이 많아질 때 에너지 소모가 커질 수 있습니다.",
    example: "주간 일정에 휴식 시간을 고정해두면 지속력이 좋아집니다.",
    action: "오늘 표현하고 싶은 메시지 1개를 기록해보세요.",
  },
  상관: {
    summary: "상관은 ‘창의와 돌파’ 성향이 강하게 나타납니다.",
    points: ["창의적", "돌파력", "규칙 깨기"],
    caution: "충동적으로 결정하지 않도록 기준을 만들어두세요.",
    example: "아이디어를 실행하기 전 체크리스트 3가지를 점검하세요.",
    action: "실행 전 ‘왜 필요한지’ 한 줄만 적어보세요.",
  },
  "편재": {
    summary: "편재는 활동을 통해 재물을 얻는 성향입니다.",
    points: ["사업 감각", "영업/투자 적성", "기회 포착 능력"],
    caution: "돈의 흐름이 불안정할 수 있고 소비가 커질 수 있습니다.",
    example: "수입과 지출을 주 1회 점검하면 안정성이 높아집니다.",
    action: "오늘의 소비 1건을 기록해 흐름을 파악해보세요.",
  },
  정재: {
    summary: "정재는 성실하게 쌓아 올리는 재물 성향입니다.",
    points: ["계획적", "안정적", "저축형"],
    caution: "새로운 기회를 놓칠 수 있어 작은 도전을 섞어보세요.",
    example: "월 1회 작은 투자/학습을 시도하면 균형이 좋아집니다.",
    action: "오늘의 지출/저축을 3줄로 정리해보세요.",
  },
  "편관(칠살)": {
    summary: "편관은 도전과 결단의 기운이 강한 유형입니다.",
    points: ["결단력", "승부욕", "위기 대응"],
    caution: "속도만 빠르면 피로가 누적될 수 있습니다.",
    example: "큰 결정을 할 때 하루 숙고 시간을 두세요.",
    action: "중요한 결정을 하나 골라 24시간 숙고 규칙을 적용해보세요.",
  },
  정관: {
    summary: "정관은 책임과 안정의 성향이 강한 유형입니다.",
    points: ["책임감", "규칙 준수", "신뢰"],
    caution: "완벽함에 집착하면 스트레스가 커질 수 있습니다.",
    example: "완벽보다 ‘충분히 좋은 기준’을 정해보세요.",
    action: "오늘 기준을 하나 정하고, 80%만 채워도 완료로 처리해보세요.",
  },
  편인: {
    summary: "편인은 직관과 분석 기운이 강한 유형입니다.",
    points: ["분석력", "통찰", "깊은 사고"],
    caution: "생각이 많아 실행이 늦어질 수 있습니다.",
    example: "아이디어를 30분 안에 작은 행동으로 옮겨보세요.",
    action: "생각 중인 아이디어를 1단계 행동으로 쪼개보세요.",
  },
  정인: {
    summary: "정인은 보호와 학습의 기운이 강한 유형입니다.",
    points: ["학습력", "배려", "안정"],
    caution: "안정만 추구하면 변화에 둔감해질 수 있습니다.",
    example: "새로운 것을 월 1회 경험해보세요.",
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
  const [unknownTime, setUnknownTime] = useState(false);
  const [original, setOriginal] = useState<OriginalResponse | null>(null);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"analysis" | "glossary">("analysis");
  const [activeTenGod, setActiveTenGod] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  const fetchWithTimeout = async (input: RequestInfo, init: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOriginal = async () => {
    setOriginalLoading(true);
    setOriginalError(null);

    try {
      const payload = {
        ...form,
        birth_time: unknownTime ? null : form.birth_time,
      };

      const response = await fetchWithTimeout(`${apiBase}/api/original`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "요청 실패");
      }

      const data = (await response.json()) as OriginalResponse;
      setOriginal(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setOriginalError("서버 응답이 지연되고 있어요. 백엔드 실행 상태를 확인해 주세요.");
      } else {
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

    try {
      const payload = {
        ...form,
        birth_time: unknownTime ? null : form.birth_time,
      };

      const response = await fetchWithTimeout(`${apiBase}/api/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "요청 실패");
      }

      const data = (await response.json()) as AnalysisResponse;
      setResult(data);
      setActiveView("analysis");
      await handleOriginal();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("서버 응답이 지연되고 있어요. 백엔드 실행 상태를 확인해 주세요.");
      } else {
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
        return {
          term,
          subtitle: base?.subtitle ?? "",
          count: tenGodCounts[term] ?? 0,
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
  const tenGodInsight = selectedTenGod
    ? `${selectedTenGod} 비중이 ${selectedTenGodCount}회로 ${
        selectedTenGodCount >= 2 ? "두드러져" : "보이며"
      } ${selectedTenGodDetail?.summary ?? ""}`
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
                    {term.count ? ` · ${term.count}` : ""}
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
                    <p>{detail.summary}</p>
                    <ul>
                      {detail.points.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                    <p>주의점: {detail.caution}</p>
                    <p>생활 예시: {detail.example}</p>
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
              <div>
                <strong>강점</strong>
                <ul>
                  {selectedTenGodDetail.points.map((point) => (
                    <li key={point}>✔ {point}</li>
                  ))}
                </ul>
              </div>
              <p>주의점: {selectedTenGodDetail.caution}</p>
              <p>생활 예시: {selectedTenGodDetail.example}</p>
              <p>오늘 추천 행동: {selectedTenGodDetail.action}</p>
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
