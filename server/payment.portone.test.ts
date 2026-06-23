import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";
import { getPortoneClient, isPortoneCheckoutReady } from "./_core/portone";

/**
 * 포트원 V2 결제 모듈 검증 테스트.
 * 실제 네트워크 호출 없이, 키 로드 / 클라이언트 형태 / 준비 상태 판정 로직을 확인한다.
 */
describe("Portone V2 키/클라이언트", () => {
  it("Store ID가 로드되고 store- 접두사를 가져야 함", () => {
    expect(ENV.portoneStoreId).toBeDefined();
    expect(ENV.portoneStoreId).toMatch(/^store-/);
  });

  it("API Secret이 충분한 길이로 로드되어야 함", () => {
    expect(ENV.portoneApiSecret).toBeDefined();
    expect(ENV.portoneApiSecret.length).toBeGreaterThan(20);
  });

  it("클라이언트는 검증(getPayment)과 취소(cancelPayment) 메서드를 노출해야 함", () => {
    const client = getPortoneClient();
    expect(client).toBeDefined();
    expect(typeof client.getPayment).toBe("function");
    expect(typeof client.cancelPayment).toBe("function");
  });
});

describe("isPortoneCheckoutReady (결제창 준비 판정)", () => {
  it("Store ID와 채널 키가 모두 있어야만 true", () => {
    const ready = isPortoneCheckoutReady();
    // 채널 키 존재 여부에 따라 결과가 갈린다.
    if (ENV.portoneStoreId && ENV.portoneChannelKey) {
      expect(ready).toBe(true);
    } else {
      expect(ready).toBe(false);
    }
  });
});
