import { describe, it, expect } from "vitest";
import { computeOwnedUserIds, computeCanAccess } from "./db";

// 운영자 계정 내부 id 예시: 지메일=1, 카카오=8130001 (실제 DB 분포 기준)
const OWNER_IDS = [1, 8130001];

describe("computeOwnedUserIds - 운영자 멀티 계정 데이터 통합", () => {
  it("일반 사용자는 본인 id 하나만 반환한다 (기존 동작 유지)", () => {
    expect(computeOwnedUserIds(42, false, OWNER_IDS)).toEqual([42]);
  });

  it("일반 사용자는 운영자 id 목록을 받아도 본인만 반환한다", () => {
    // ownerIds가 잘못 전달되어도 일반 사용자에겐 영향 없음
    expect(computeOwnedUserIds(42, false, OWNER_IDS)).toEqual([42]);
  });

  it("운영자는 본인+모든 운영자 계정 id를 합산한다", () => {
    const ids = computeOwnedUserIds(1, true, OWNER_IDS);
    expect(ids).toContain(1);
    expect(ids).toContain(8130001);
    expect(ids.length).toBe(2);
  });

  it("운영자가 카카오(8130001)로 들어와도 지메일(1) 데이터 id가 포함된다", () => {
    const ids = computeOwnedUserIds(8130001, true, OWNER_IDS);
    expect(ids).toContain(1);
    expect(ids).toContain(8130001);
  });

  it("중복 id는 제거된다", () => {
    const ids = computeOwnedUserIds(1, true, [1, 1, 8130001]);
    expect(ids.sort()).toEqual([1, 8130001]);
  });

  it("본인 id가 운영자 목록에 없어도 항상 포함된다(안전장치)", () => {
    const ids = computeOwnedUserIds(999, true, OWNER_IDS);
    expect(ids).toContain(999);
    expect(ids).toContain(1);
    expect(ids).toContain(8130001);
  });
});

describe("computeCanAccess - 단건 데이터 소유권 판정", () => {
  it("본인 데이터는 일반 사용자도 접근 허용", () => {
    expect(computeCanAccess(42, false, 42, [])).toBe(true);
  });

  it("남의 데이터는 일반 사용자는 불허", () => {
    expect(computeCanAccess(42, false, 99, [])).toBe(false);
  });

  it("운영자는 다른 운영자 계정 데이터 접근 허용", () => {
    expect(computeCanAccess(8130001, true, 1, OWNER_IDS)).toBe(true);
  });

  it("운영자라도 운영자 목록 밖(일반 고객) 데이터는 불허", () => {
    expect(computeCanAccess(1, true, 555, OWNER_IDS)).toBe(false);
  });

  it("rowUserId가 null/undefined면 불허", () => {
    expect(computeCanAccess(1, true, null, OWNER_IDS)).toBe(false);
    expect(computeCanAccess(1, true, undefined, OWNER_IDS)).toBe(false);
  });

  it("운영자 본인 id는 ownerIds와 무관하게 항상 허용", () => {
    expect(computeCanAccess(1, true, 1, [])).toBe(true);
  });
});
