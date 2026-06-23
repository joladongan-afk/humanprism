import { describe, it, expect } from "vitest";
import { consultActiveTab } from "@shared/consultActiveTab";

describe("consultActiveTab — 상담 화면 상단 네비 활성 탭 매핑", () => {
  it("궁합 채팅은 '궁합' 탭(/compatibility)을 활성화한다", () => {
    expect(consultActiveTab("compatibility_chat")).toBe("/compatibility");
  });

  it("마스터 채팅/대면 상담은 '마스터 상담' 탭(/appointments/new)을 활성화한다", () => {
    expect(consultActiveTab("master_chat")).toBe("/appointments/new");
    expect(consultActiveTab("master_offline")).toBe("/appointments/new");
  });

  it("개인 상담 계열(free/taste/event/deep)은 '개인 상담' 탭(/plans)을 활성화한다", () => {
    expect(consultActiveTab("free")).toBe("/plans");
    expect(consultActiveTab("taste")).toBe("/plans");
    expect(consultActiveTab("event")).toBe("/plans");
    expect(consultActiveTab("deep")).toBe("/plans");
  });

  it("알 수 없는/빈 planType은 기본적으로 '개인 상담' 탭으로 떨어진다", () => {
    expect(consultActiveTab(undefined)).toBe("/plans");
    expect(consultActiveTab(null)).toBe("/plans");
    expect(consultActiveTab("unknown_plan")).toBe("/plans");
  });
});
