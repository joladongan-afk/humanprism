// 천간 10 물상 + 지지 12 동물 입체 아이콘 매핑 테이블
// 세라믹+금박 민화풍 3D 피규어 (초록 크로마키 제거 후 투명 배경 PNG)
// url 이 비어있으면(undefined) UI는 한자 글자만 표시(폴백).

export type GlyphIcon = {
  url?: string; // 입체 아이콘 이미지 (없으면 폴백)
  hint: string; // 물상/동물 설명 (호버 툴팁 등)
};

// 천간 10 — 물상(物象)
export const STEM_ICONS: Record<string, GlyphIcon> = {
  갑: { url: "/img/stem-gap_e428fc7f.png", hint: "甲 · 큰 나무(巨木)" },
  을: { url: "/img/stem-eul_a44c4057.png", hint: "乙 · 화초·덩굴(花草)" },
  병: { url: "/img/stem-byeong_7607c764.png", hint: "丙 · 태양(太陽)" },
  정: { url: "/img/stem-jeong_2e0a7083.png", hint: "丁 · 촛불·등불(燈火)" },
  무: { url: "/img/stem-mu_bc57f520.png", hint: "戊 · 큰 산·대지(大地)" },
  기: { url: "/img/stem-gi_10c802fa.png", hint: "己 · 밭·정원(田園)" },
  경: { url: "/img/stem-gyeong_99ce9910.png", hint: "庚 · 무쇠·바위(原石)" },
  신: { url: "/img/stem-sin_c459e5a3.png", hint: "辛 · 보석·금속(珠玉)" },
  임: { url: "/img/stem-im_4443a86f.png", hint: "壬 · 바다·강(大海)" },
  계: { url: "/img/stem-gye_82eb6383.png", hint: "癸 · 비·이슬(雨露)" },
};

// 지지 12 — 동물(動物)
export const BRANCH_ICONS: Record<string, GlyphIcon> = {
  자: { url: "/img/zodiac-rat_4b545347.png", hint: "子 · 쥐(鼠)" },
  축: { url: "/img/zodiac-ox_68365a32.png", hint: "丑 · 소(牛)" },
  인: { url: "/img/zodiac-tiger_edd7034f.png", hint: "寅 · 호랑이(虎)" },
  묘: { url: "/img/zodiac-rabbit_c6c77e9e.png", hint: "卯 · 토끼(兎)" },
  진: { url: "/img/zodiac-dragon_d9f94a9b.png", hint: "辰 · 용(龍)" },
  사: { url: "/img/zodiac-snake_14e15c52.png", hint: "巳 · 뱀(蛇)" },
  오: { url: "/img/zodiac-horse_a6265092.png", hint: "午 · 말(馬)" },
  미: { url: "/img/zodiac-sheep_2fcf96fd.png", hint: "未 · 양(羊)" },
  신: { url: "/img/zodiac-monkey_952a8a10.png", hint: "申 · 원숭이(猴)" },
  유: { url: "/img/zodiac-rooster_da635d0e.png", hint: "酉 · 닭(鷄)" },
  술: { url: "/img/zodiac-dog_ea65146b.png", hint: "戌 · 개(犬)" },
  해: { url: "/img/zodiac-pig_76abad92.png", hint: "亥 · 돼지(豬)" },
};
