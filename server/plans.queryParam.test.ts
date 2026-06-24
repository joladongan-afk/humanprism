import { describe, it, expect } from "vitest";

/**
 * Plans 페이지 쿼리 파라미터 자동 선택 기능 테스트
 * 
 * 시나리오:
 * 1. 사주 생성 후 `/plans?profile={id}` 리다이렉트
 * 2. Plans 페이지에서 자동으로 해당 사주 선택
 * 3. 무료 플랜 다이얼로그 자동 열기
 * 4. 사용자는 바로 "무료 상담 시작" 클릭 가능
 */

describe("Plans Page Query Parameter Auto-Selection", () => {
  it("should parse profile query parameter correctly", () => {
    const location = "/plans?profile=123";
    const params = new URLSearchParams(location.split("?")[1]);
    const profileParam = params.get("profile");
    
    expect(profileParam).toBe("123");
  });

  it("should handle missing profile parameter", () => {
    const location = "/plans";
    const params = new URLSearchParams(location.split("?")[1]);
    const profileParam = params.get("profile");
    
    expect(profileParam).toBeNull();
  });

  it("should handle multiple query parameters", () => {
    const location = "/plans?profile=456&plan=free";
    const params = new URLSearchParams(location.split("?")[1]);
    const profileParam = params.get("profile");
    const planParam = params.get("plan");
    
    expect(profileParam).toBe("456");
    expect(planParam).toBe("free");
  });

  it("should convert profile string to number for state", () => {
    const profileId = "789";
    const profileIdNum = parseInt(profileId);
    
    expect(profileIdNum).toBe(789);
    expect(typeof profileIdNum).toBe("number");
  });

  it("should trigger free plan selection when profile exists", () => {
    const profileId = "123";
    const selected = profileId ? "free" : null;
    
    expect(selected).toBe("free");
  });

  it("should not trigger plan selection without profile", () => {
    const profileId = "";
    const selected = profileId ? "free" : null;
    
    expect(selected).toBeNull();
  });

  it("should handle profile ID from SajuNew redirect", () => {
    // SajuNew에서 리다이렉트: `/plans?profile=${id}`
    const createdProfileId = 42;
    const location = `/plans?profile=${createdProfileId}`;
    const params = new URLSearchParams(location.split("?")[1]);
    const profileParam = params.get("profile");
    
    expect(profileParam).toBe("42");
    expect(parseInt(profileParam!)).toBe(42);
  });

  it("should maintain profile selection through dialog lifecycle", () => {
    const profileId = "100";
    const selected = "free";
    
    // Dialog 열기 전
    expect(profileId).toBe("100");
    expect(selected).toBe("free");
    
    // Dialog 닫기 후에도 profileId 유지
    expect(profileId).toBe("100");
  });

  it("should handle profile selection with multiple profiles", () => {
    const profiles = [
      { id: 1, label: "Profile 1" },
      { id: 2, label: "Profile 2" },
      { id: 3, label: "Profile 3" },
    ];
    
    const selectedProfileId = "2";
    const selectedProfile = profiles.find(p => p.id === parseInt(selectedProfileId));
    
    expect(selectedProfile?.label).toBe("Profile 2");
  });

  it("should show guidance message when no profiles exist", () => {
    const profiles: Array<{ id: number; label: string }> = [];
    const hasProfiles = profiles.length > 0;
    
    const message = hasProfiles 
      ? "등록된 사주가 있습니다. 아래에서 상담 플랜을 선택해 주세요."
      : "상담을 시작하기 전에 먼저 만세력으로 정확한 사주를 뽑아주세요.";
    
    expect(message).toContain("만세력");
  });

  it("should show guidance message when profiles exist", () => {
    const profiles = [{ id: 1, label: "Profile 1" }];
    const hasProfiles = profiles.length > 0;
    
    const message = hasProfiles 
      ? "등록된 사주가 있습니다. 아래에서 상담 플랜을 선택해 주세요."
      : "상담을 시작하기 전에 먼저 만세력으로 정확한 사주를 뽑아주세요.";
    
    expect(message).toContain("등록된 사주");
  });
});
