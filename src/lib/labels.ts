export const ORDER_STATUS_LABEL = {
  payment_pending: "결제대기",
  paid: "결제완료",
  preparing: "상품준비",
  shipping: "배송중",
  delivered: "배송완료",
  confirmed: "구매확정",
  cancelled: "취소",
} as const;

export const PAYMENT_STATUS_LABEL = {
  ready: "결제준비",
  paid: "결제완료",
  failed: "결제실패",
  cancelled: "결제취소",
  partial_refunded: "부분환불",
  refunded: "환불완료",
} as const;

export const RETURN_STATUS_LABEL = {
  requested: "요청",
  approved: "승인",
  collecting: "회수중",
  received: "입고",
  refunded: "환불완료",
  rejected: "반려",
} as const;

export const SHIPMENT_STATUS_LABEL = {
  preparing: "배송준비",
  shipped: "출고",
  in_transit: "이동중",
  delivered: "배송완료",
} as const;

export const PO_STATUS_LABEL = {
  draft: "초안",
  ordered: "발주",
  partial: "부분입고",
  received: "입고완료",
  cancelled: "취소",
} as const;

export const PRODUCT_STATUS_LABEL = {
  on_sale: "판매중",
  sold_out: "품절",
  hidden: "숨김",
  stopped: "판매중지",
} as const;

export const CARRIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"] as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABEL;
export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABEL;
export type ReturnStatus = keyof typeof RETURN_STATUS_LABEL;

export function labelOf(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return "-";
  return map[key] ?? key;
}
