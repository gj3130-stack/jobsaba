export interface CourierService {
  readonly provider: string;
  registerShipment(input: { orderNo: string; carrier: string }): Promise<{ trackingNo: string; status: "shipped" }>;
  track(input: { carrier: string; trackingNo: string }): Promise<{ status: string; summary: string }>;
}

export interface TaxDocumentService {
  readonly provider: string;
  request(input: {
    orderNo: string;
    docType: "cash_receipt" | "tax_invoice";
    payload: Record<string, string>;
  }): Promise<{ status: "requested"; providerRef: string }>;
}

export const mockCourier: CourierService = {
  provider: "mock",
  async registerShipment(input) {
    const suffix = input.orderNo.replace(/\D/g, "").slice(-8) || "00000000";
    return { trackingNo: `MOCK${suffix}`, status: "shipped" };
  },
  async track(input) {
    return {
      status: "in_transit",
      summary: `${input.carrier} 모의 조회: 송장 ${input.trackingNo}은 이동 중으로 표시됩니다. 실제 택배사 API는 연결되어 있지 않습니다.`,
    };
  },
};

export const mockTaxDocuments: TaxDocumentService = {
  provider: "mock",
  async request(input) {
    return {
      status: "requested",
      providerRef: `mock-doc-${input.orderNo}-${input.docType}`,
    };
  },
};

export function getCourierService(): CourierService {
  const provider = process.env.COURIER_PROVIDER?.trim() || "mock";
  if (provider === "mock") return mockCourier;
  throw new Error(`지원하지 않는 COURIER_PROVIDER 입니다: ${provider}`);
}

export function getTaxDocumentService(): TaxDocumentService {
  const provider = process.env.TAX_DOCUMENT_PROVIDER?.trim() || "mock";
  if (provider === "mock") return mockTaxDocuments;
  throw new Error(`지원하지 않는 TAX_DOCUMENT_PROVIDER 입니다: ${provider}`);
}
