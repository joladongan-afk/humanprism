/**
 * 휴먼프리즘 워드마크 로고 (스테인드글라스 프리즘 + 일렁이는 광채)
 *
 * 원본 PNG 비율: 2576 x 580 ≈ 4.44 : 1
 *
 * [버그 이력 — 로그인 시 로고 깨짐]
 *   기존 로고는 2.3MB짜리 큰 PNG였다. 로그인 직후에는 사용자 데이터·명조·
 *   무거운 히어로 애니메이션이 한꺼번에 로드되는데, 그 경합 속에서 2.3MB 로고
 *   요청이 늦거나 한 번 실패하면 브라우저가 "찢어진 이미지 아이콘 + alt 텍스트"
 *   로 표시하고 다시 받아오지 않아 깨져 보였다.
 *   → 헤더 표시 크기(높이 40px)에 맞춰 가볍게 리사이즈한 전용 로고(약 100KB)를
 *     쓰고, eager + sync 디코딩으로 즉시 표시되게 한다.
 *
 * [레이아웃 안정화]
 *   span 에 height(px) + width(px) + aspect-ratio 를 명시해, 이미지 디코딩
 *   여부와 무관하게 폭이 항상 확보되도록 한다(폭 0 찌그러짐 방지).
 */

// 헤더 전용 경량 로고 (533x120, 약 100KB)
// client/public 에 두어 게시 빌드에 항상 포함 → manus-storage 404 방지
const AURORA_LOGO_SRC = "/logo-header.png";
const LOGO_RATIO = 2576 / 580; // ≈ 4.441 (원본 비율 유지)

export function AuroraLogo({ height = 36 }: { height?: number }) {
  return (
    <span
      className="hp-aurora-logo inline-block"
      style={{ height, width: Math.round(height * LOGO_RATIO), aspectRatio: `${LOGO_RATIO}` }}
    >
      <img
        src={AURORA_LOGO_SRC}
        alt="휴먼프리즘"
        className="hp-aurora-logo__base"
        loading="eager"
        decoding="sync"
        // @ts-expect-error fetchpriority는 표준 속성이지만 타입 정의에 없을 수 있음
        fetchpriority="high"
      />
      <img
        src={AURORA_LOGO_SRC}
        alt=""
        aria-hidden
        className="hp-aurora-logo__shimmer"
        loading="eager"
        decoding="sync"
      />
    </span>
  );
}

export { AURORA_LOGO_SRC };
