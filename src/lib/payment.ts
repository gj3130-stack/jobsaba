export type PaymentStatus = "ready" | "paid" | "failed" | "cancelled" | "partial_refunded" | "refunded";

export type PaymentIntent = {
  provider: string;
  method: string;
  amount: number;
  orderName: string;
  transactionId: string;
  status: PaymentStatus;
};

export type PaymentResult = PaymentIntent & {
  ok: boolean;
  message: string;
};

export interface PaymentService {
  readonly provider: string;
  createPayment(input: { method: string; amount: number; orderName: string }): Promise<PaymentIntent>;
  confirmPayment(intent: PaymentIntent): Promise<PaymentResult>;
  cancelPayment(intent: PaymentIntent): Promise<PaymentResult>;
  refundPayment(intent: PaymentIntent, amount: number): Promise<PaymentResult>;
}

function transactionId() {
  return `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const mockPaymentService: PaymentService = {
  provider: "mock",
  async createPayment(input) {
    return {
      provider: "mock",
      method: input.method,
      amount: input.amount,
      orderName: input.orderName,
      transactionId: transactionId(),
      status: "ready",
    };
  },
  async confirmPayment(intent) {
    if (intent.method === "mock_fail" || intent.amount < 0) {
      return {
        ...intent,
        status: "failed",
        ok: false,
        message: "모의 결제가 거절되었습니다. 다른 수단으로 다시 시도해 주세요.",
      };
    }
    return { ...intent, status: "paid", ok: true, message: "모의 결제가 승인되었습니다." };
  },
  async cancelPayment(intent) {
    return { ...intent, status: "cancelled", ok: true, message: "모의 결제를 취소했습니다." };
  },
  async refundPayment(intent, amount) {
    return {
      ...intent,
      amount,
      status: amount < intent.amount ? "partial_refunded" : "refunded",
      ok: true,
      message: "모의 환불을 기록했습니다.",
    };
  },
};

export function getPaymentService(): PaymentService {
  const provider = process.env.PAYMENT_PROVIDER?.trim() || "mock";
  if (provider === "mock") return mockPaymentService;
  throw new Error(`지원하지 않는 PAYMENT_PROVIDER 입니다: ${provider}`);
}
