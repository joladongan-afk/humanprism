// 인오술 삼합 동물 회전 스프라이트 (0/45/90/135/180) — 5컷으로 자전 효과
// 225/270/315 각도는 90/45/0 컷을 좌우 반전(scaleX)으로 보강
// (배경 크로마키 제거 후 재업로드한 URL)

export type SpinFrame = { src: string; flip: boolean };

function buildSpinFrames(urls: Record<number, string>): SpinFrame[] {
  // 0 → 45 → 90 → 135 → 180 → (135 flip) → (90 flip) → (45 flip) → loop
  return [
    { src: urls[0], flip: false },
    { src: urls[45], flip: false },
    { src: urls[90], flip: false },
    { src: urls[135], flip: false },
    { src: urls[180], flip: false },
    { src: urls[135], flip: true },
    { src: urls[90], flip: true },
    { src: urls[45], flip: true },
  ];
}

export const TIGER_FRAMES = buildSpinFrames({
  0: "/img/tiger-rot-0_b2021e11.png",
  45: "/img/tiger-rot-45_32b1a7e3.png",
  90: "/img/tiger-rot-90_32ab7c4b.png",
  135: "/img/tiger-rot-135_8706086e.png",
  180: "/img/tiger-rot-180_75494435.png",
});

export const HORSE_FRAMES = buildSpinFrames({
  0: "/img/horse-rot-0_6f1045a6.png",
  45: "/img/horse-rot-45_2bdc9246.png",
  90: "/img/horse-rot-90_175093b7.png",
  135: "/img/horse-rot-135_6218b530.png",
  180: "/img/horse-rot-180_4c545455.png",
});

export const DOG_FRAMES = buildSpinFrames({
  0: "/img/dog-rot-0_0b6f15af.png",
  45: "/img/dog-rot-45_5932adad.png",
  90: "/img/dog-rot-90_7fc37c2a.png",
  135: "/img/dog-rot-135_7bc65608.png",
  180: "/img/dog-rot-180_749b2642.png",
});

// 인오술 삼합 — 모빌 궤도에 배치할 3마리
export const MOBILE_ANIMALS: { key: string; label: string; frames: SpinFrame[] }[] = [
  { key: "tiger", label: "寅", frames: TIGER_FRAMES },
  { key: "horse", label: "午", frames: HORSE_FRAMES },
  { key: "dog", label: "戌", frames: DOG_FRAMES },
];

// 12지지 한자 (자축인묘진사오미신유술해)
export const ZODIAC_12 = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 오행 (목화토금수)
export const OHAENG = [
  { char: "木", color: "#34d399" },
  { char: "火", color: "#f87171" },
  { char: "土", color: "#fbbf24" },
  { char: "金", color: "#e5e7eb" },
  { char: "水", color: "#60a5fa" },
];

// 샘플 사주 명조 (포스텔러 캡처 기반: 김포덕 / 1994.03.22 10:20 여)
// 줄 그은 부분(십성/지장간)은 제외, 천간/지지 글자 + 물상/동물 아이콘 자리만 표시
export type Pillar = {
  position: string; // 생시 / 생일 / 생월 / 생년
  stem: string; // 천간
  stemKey: string; // 천간 키(물상 아이콘 매핑)
  branch: string; // 지지
  branchKey: string; // 지지 키(동물 아이콘 매핑)
};

export const SAMPLE_CHART: { name: string; meta: string; pillars: Pillar[] } = {
  name: "오덕구",
  meta: "",
  // 좌→우로 생시/생일/생월/생년 배치 (화면 오른쪽=생년, 왼쪽=생시)
  // 병오년 을미월 정해일 경술시
  pillars: [
    { position: "생시", stem: "庚", stemKey: "경", branch: "戌", branchKey: "술" },
    { position: "생일", stem: "丁", stemKey: "정", branch: "亥", branchKey: "해" },
    { position: "생월", stem: "乙", stemKey: "을", branch: "未", branchKey: "미" },
    { position: "생년", stem: "丙", stemKey: "병", branch: "午", branchKey: "오" },
  ],
};
