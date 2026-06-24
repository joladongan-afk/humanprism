import axios, { AxiosInstance } from "axios";
import { ENV } from "./env";

/**
 * 포트원 V2 결제 단건조회 응답 중 우리가 사용하는 부분만 추린 타입.
 * 전체 스펙은 https://developers.portone.io/api/rest-v2/payment 참고.
 */
export interface PortonePayment {
  status: string; // READY | PAID | VIRTUAL_ACCOUNT_ISSUED | CANCELLED | FAILED ...
  id: string; // 결제 건 ID (우리가 보낸 paymentId)
  orderName?: string;
  amount?: {
    total: number;
    paid?: number;
    cancelled?: number;
  };
  method?: {
    type?: string; // PaymentMethodCard 등
  };
  paidAt?: string;
  [key: string]: unknown;
}

/**
 * 포트원 V2 API 클라이언트.
 * 인증 결제(결제창) 흐름에서 서버는 "결제 단건조회"로 검증하고,
 * 필요 시 "결제 취소"를 호출한다. 결제 자체는 브라우저 SDK가 수행한다.
 */
export class PortoneClient {
  private client: AxiosInstance;

  constructor() {
    const apiSecret = ENV.portoneApiSecret;
    if (!apiSecret) {
      throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않음");
    }

    this.client = axios.create({
      baseURL: "https://api.portone.io",
      headers: {
        "Content-Type": "application/json",
        Authorization: `PortOne ${apiSecret}`,
      },
      timeout: 60000, // 포트원 권장: 최소 60초
    });
  }

  /**
   * 결제 단건 조회 (검증용).
   * 클라이언트 결제창에서 결제가 끝난 뒤, 서버가 실제 결제 상태/금액을 확인한다.
   * https://developers.portone.io/api/rest-v2/payment#get
   */
  async getPayment(paymentId: string): Promise<PortonePayment> {
    const response = await this.client.get<PortonePayment>(
      `/payments/${encodeURIComponent(paymentId)}`,
    );
    return response.data;
  }

  /**
   * 결제 취소(환불).
   * https://developers.portone.io/api/rest-v2/payment#post-/payments/-paymentId-/cancel
   */
  async cancelPayment(
    paymentId: string,
    params?: { reason?: string; cancelAmount?: number },
  ) {
    const response = await this.client.post(
      `/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        reason: params?.reason ?? "고객 요청 취소",
        ...(params?.cancelAmount ? { amount: params.cancelAmount } : {}),
      },
    );
    return response.data;
  }
}

let portoneClient: PortoneClient | null = null;

export function getPortoneClient(): PortoneClient {
  if (!portoneClient) {
    portoneClient = new PortoneClient();
  }
  return portoneClient;
}

/**
 * 포트원 결제창을 띄울 수 있는 환경(키)이 갖춰졌는지 여부.
 * Store ID와 채널 키가 모두 있어야 결제창 호출이 가능하다.
 */
export function isPortoneCheckoutReady(): boolean {
  return Boolean(ENV.portoneStoreId && ENV.portoneChannelKey);
}
