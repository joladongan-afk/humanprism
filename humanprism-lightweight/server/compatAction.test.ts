import { describe, it, expect } from "vitest";
import { resolveCompatAction } from "../shared/compatAction";

describe("resolveCompatAction — 궁합 신청 동선", () => {
  it("사주 0개(신규 방문자): 결제를 막지 않고 입력 단계로 유도한다", () => {
    const r = resolveCompatAction({ profileCount: 0, profileAId: "", profileBId: "" });
    expect(r.kind).toBe("need_profiles");
  });

  it("사주 1개: 아직 부족하므로 입력 단계로 유도한다", () => {
    const r = resolveCompatAction({ profileCount: 1, profileAId: "1", profileBId: "" });
    expect(r.kind).toBe("need_profiles");
  });

  it("사주 2개 이상이나 두 사람 미선택: 선택을 유도한다", () => {
    const r = resolveCompatAction({ profileCount: 3, profileAId: "1", profileBId: "" });
    expect(r.kind).toBe("need_selection");
  });

  it("동일 인물 두 번 선택: 오류로 막는다", () => {
    const r = resolveCompatAction({ profileCount: 3, profileAId: "2", profileBId: "2" });
    expect(r.kind).toBe("same_profile");
  });

  it("사주 충분 + 서로 다른 두 사람 선택: 결제 진행", () => {
    const r = resolveCompatAction({ profileCount: 3, profileAId: "1", profileBId: "2" });
    expect(r.kind).toBe("proceed");
  });

  it("핵심: 사주가 부족해도 신청 클릭이 '차단(throw)'되지 않고 항상 유효한 동작을 돌려준다", () => {
    for (let n = 0; n <= 3; n++) {
      const r = resolveCompatAction({ profileCount: n, profileAId: "1", profileBId: "2" });
      expect(["need_profiles", "need_selection", "same_profile", "proceed"]).toContain(r.kind);
    }
  });
});
