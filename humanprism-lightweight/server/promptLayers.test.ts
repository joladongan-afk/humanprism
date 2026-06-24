import { describe, it, expect } from "vitest";
import {
  buildSystemLayers,
  buildPersonalDynamicContext,
  buildGanjiMappingTable,
  L1_CORE_PERSONA,
  L2_PERSONAL_POLICY,
  L2_COMPATIBILITY_POLICY,
  L3_PERSONAL_STYLE,
  L3_COMPATIBILITY_STYLE,
  LAYER_VERSIONS,
} from "./promptLayers";
import { calculateSaju } from "./saju";

const sampleSaju = calculateSaju({
  year: 1990,
  month: 5,
  day: 15,
  hour: 10,
  minute: 30,
  gender: "male",
});

describe("4계층 프롬프트 아키텍처", () => {
  it("L1 페르소나는 마스터 정체성을 담고 충분히 길다(고정 캐시 대상, 실명 미노출)", () => {
    expect(L1_CORE_PERSONA.length).toBeGreaterThan(1000);
  });

  it("L2 정책은 개인/궁합 모드별로 다르다", () => {
    expect(L2_PERSONAL_POLICY).toContain("개인상담");
    expect(L2_PERSONAL_POLICY).toContain("궁합은 개인상담에서 본격적으로 풀지 않습니다");
    expect(L2_COMPATIBILITY_POLICY).toContain("궁합");
    expect(L2_PERSONAL_POLICY).not.toEqual(L2_COMPATIBILITY_POLICY);
  });

  it("L3 스타일은 화법/금지 규칙을 담고 모드별로 다르다", () => {
    expect(L3_PERSONAL_STYLE).toContain("이모지");
    expect(L3_COMPATIBILITY_STYLE).toContain("OO님");
    expect(L3_PERSONAL_STYLE).not.toEqual(L3_COMPATIBILITY_STYLE);
  });

  it("호칭 규칙: 'OO씨'는 금지하고 'OO님'을 강제한다", () => {
    expect(L2_PERSONAL_POLICY).toContain("OO님");
    expect(L2_PERSONAL_POLICY).toContain("OO씨");
    expect(L3_COMPATIBILITY_STYLE).toContain("OO님");
  });

  it("기본 전략: 개인 모드는 단일 고정 캐시 블록[L1+L2+L3]", () => {
    const { cachedBlocks } = buildSystemLayers("personal");
    expect(cachedBlocks).toHaveLength(1);
    // 고정 블록 안에 세 계층이 모두 포함되어야 한다
    expect(cachedBlocks[0]).toContain(L1_CORE_PERSONA);
    expect(cachedBlocks[0]).toContain("개인상담");
    expect(cachedBlocks[0]).toContain("이모지");
  });

  it("기본 전략: 궁합 모드도 단일 고정 캐시 블록[L1+L2+L3]", () => {
    const { cachedBlocks } = buildSystemLayers("compatibility");
    expect(cachedBlocks).toHaveLength(1);
    expect(cachedBlocks[0]).toContain(L1_CORE_PERSONA);
    expect(cachedBlocks[0]).toContain("궁합");
  });

  it("splitStyleLayer=true면 [L1+L2]/[L3] 2단 캐시 블록으로 분리한다", () => {
    const { cachedBlocks } = buildSystemLayers("personal", { splitStyleLayer: true });
    expect(cachedBlocks).toHaveLength(2);
    expect(cachedBlocks[0]).toContain(L1_CORE_PERSONA);
    // L3 스타일 고유 문구는 분리된 두 번째 블록에만 있어야 한다
    expect(cachedBlocks[1]).toContain("표현·화법 규칙");
    expect(cachedBlocks[0]).not.toContain("표현·화법 규칙");
  });

  it("L2 고정 블록에는 신뢰할 수 있는 간지 매핑 테이블이 포함된다", () => {
    const { cachedBlocks } = buildSystemLayers("personal");
    expect(cachedBlocks[0]).toContain("만세력 기반 간지 매핑");
    expect(cachedBlocks[0]).toContain("2026년");
  });

  it("계층 버전 태그가 노출된다(A/B·모델교체 추적용)", () => {
    const { versions } = buildSystemLayers("personal");
    expect(versions).toEqual(LAYER_VERSIONS);
    expect(versions.L1_persona).toBe("v4");
  });

  it("L4 동적 컨텍스트는 사주 데이터를 담고 고정 계층과 분리되어 있다", () => {
    const dynamic = buildPersonalDynamicContext(sampleSaju, "free_5min");
    expect(dynamic).toContain("사주팔자");
    expect(dynamic).toContain("일간");
    expect(dynamic).toContain("상담 플랜");
    // 동적 블록에는 페르소나(고정)가 들어가면 안 된다 → 캐시 효율 보장
    expect(dynamic).not.toContain(L1_CORE_PERSONA);
  });

  it("간지 매핑 테이블은 2026년=병오년을 정확히 담는다", () => {
    const table = buildGanjiMappingTable();
    expect(table).toContain("2026년: 丙午");
  });
});
