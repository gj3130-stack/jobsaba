import { formatKRW } from "@/lib/format";

/**
 * 주문 금액 계산. SQL `calculate_checkout` 과 같은 규칙이다.
 * 상품할인(정상가-판매가) → 쿠폰 → 포인트 → 배송비 → 결제금액.
 * 쿠폰·포인트는 정수 비율로 배분하고, 나머지 원 단위는 뒤쪽 라인부터 채운다.
 */

export const DEFAULT_POLICY = {
  pointRateBps: 100,
  pointMinUse: 1000,
  pointExpiryDays: 365,
  freeShippingThreshold: 40000,
  baseShippingFee: 3000,
  maxCouponsPerOrder: 1,
} as const;

export type ShopPolicy = {
  pointRateBps: number;
  pointMinUse: number;
  pointExpiryDays: number;
  freeShippingThreshold: number;
  baseShippingFee: number;
  maxCouponsPerOrder: number;
};

export type ProductStatus = "on_sale" | "sold_out" | "hidden" | "stopped";

export type PricingItem = {
  variantId: string;
  productId: string;
  categoryId: string | null;
  name: string;
  optionName: string;
  sku: string;
  listPrice: number;
  salePrice: number;
  quantity: number;
  stock: number;
  productStatus: ProductStatus;
  variantActive: boolean;
  pointRateBps: number;
};

export type CouponPolicy = {
  userCouponId: string;
  couponId: string;
  name: string;
  code: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  categoryId: string | null;
  productId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: "available" | "used" | "expired" | "restored";
  isActive: boolean;
};

export type QuoteLine = {
  variantId: string;
  productId: string;
  name: string;
  optionName: string;
  sku: string;
  listPrice: number;
  salePrice: number;
  quantity: number;
  pointRateBps: number;
  lineList: number;
  lineSale: number;
  lineCoupon: number;
  linePoints: number;
  lineBase: number;
  lineEarn: number;
};

export type Quote = {
  ok: boolean;
  errors: string[];
  lines: QuoteLine[];
  listSubtotal: number;
  saleSubtotal: number;
  productDiscount: number;
  eligibleSubtotal: number;
  couponDiscount: number;
  pointsUsed: number;
  shippingFee: number;
  total: number;
  pointsEarned: number;
};

export type LedgerType = "earn" | "use" | "restore" | "expire" | "adjust";

export type LedgerEntry = {
  id?: string;
  type: LedgerType;
  amount: number;
  expiresAt?: string | null;
  createdAt: string;
};

type Lot = { remaining: number; expiresAt: number | null };

export function allocateWeights(weights: number[], total: number) {
  const shares = weights.map(() => 0);
  if (weights.length === 0 || total <= 0) return shares;
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (sum <= 0) return shares;
  let used = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (weights[i] <= 0) continue;
    const share = Math.floor((total * weights[i]) / sum);
    shares[i] = share;
    used += share;
  }
  let remainder = total - used;
  for (let i = weights.length - 1; i >= 0 && remainder > 0; i -= 1) {
    const room = weights[i] - shares[i];
    if (room <= 0) continue;
    const give = Math.min(room, remainder);
    shares[i] += give;
    remainder -= give;
  }
  return shares;
}

function mergeItems(items: PricingItem[]) {
  const map = new Map<string, PricingItem>();
  for (const item of items) {
    const prev = map.get(item.variantId);
    if (!prev) map.set(item.variantId, { ...item });
    else prev.quantity += item.quantity;
  }
  return [...map.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
}

function emptyQuote(errors: string[]): Quote {
  return {
    ok: false,
    errors,
    lines: [],
    listSubtotal: 0,
    saleSubtotal: 0,
    productDiscount: 0,
    eligibleSubtotal: 0,
    couponDiscount: 0,
    pointsUsed: 0,
    shippingFee: 0,
    total: 0,
    pointsEarned: 0,
  };
}

function isEligible(item: PricingItem, coupon: CouponPolicy) {
  if (coupon.categoryId && item.categoryId !== coupon.categoryId) return false;
  if (coupon.productId && item.productId !== coupon.productId) return false;
  return true;
}

export function calculateOrder(input: {
  items: PricingItem[];
  coupon?: CouponPolicy | null;
  pointsToUse: number;
  pointBalance: number;
  now?: Date;
  policy?: Partial<ShopPolicy>;
}): Quote {
  const policy: ShopPolicy = { ...DEFAULT_POLICY, ...input.policy };
  const now = input.now ?? new Date();
  const errors: string[] = [];
  const items = mergeItems(input.items);

  if (items.length === 0) return emptyQuote(["주문할 상품이 없습니다."]);

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`${item.name} 수량은 1 이상이어야 합니다.`);
    }
    if (!Number.isInteger(item.salePrice) || item.salePrice < 0 || !Number.isInteger(item.listPrice)) {
      errors.push(`${item.name} 가격 정보가 올바르지 않습니다.`);
    }
    if (!item.variantActive) errors.push(`${item.name} 옵션은 판매 중이 아닙니다.`);
    if (item.productStatus !== "on_sale") errors.push(`${item.name} 상품은 판매 중이 아닙니다.`);
    if (item.quantity > item.stock) errors.push(`${item.name} 재고가 부족합니다.`);
  }

  const lines: QuoteLine[] = items.map((item) => ({
    variantId: item.variantId,
    productId: item.productId,
    name: item.name,
    optionName: item.optionName,
    sku: item.sku,
    listPrice: item.listPrice,
    salePrice: item.salePrice,
    quantity: item.quantity,
    pointRateBps: item.pointRateBps,
    lineList: item.listPrice * item.quantity,
    lineSale: item.salePrice * item.quantity,
    lineCoupon: 0,
    linePoints: 0,
    lineBase: 0,
    lineEarn: 0,
  }));

  const listSubtotal = lines.reduce((sum, line) => sum + line.lineList, 0);
  const saleSubtotal = lines.reduce((sum, line) => sum + line.lineSale, 0);
  const productDiscount = Math.max(0, listSubtotal - saleSubtotal);

  let eligibleSubtotal = 0;
  let couponDiscount = 0;
  const coupon = input.coupon ?? null;

  if (coupon) {
    if (policy.maxCouponsPerOrder < 1) errors.push("쿠폰을 사용할 수 없는 주문입니다.");
    const eligibleIndexes = items
      .map((item, index) => (isEligible(item, coupon) ? index : -1))
      .filter((index) => index >= 0);
    eligibleSubtotal = eligibleIndexes.reduce((sum, index) => sum + lines[index].lineSale, 0);
    const starts = coupon.startsAt ? new Date(coupon.startsAt) : null;
    const ends = coupon.endsAt ? new Date(coupon.endsAt) : null;

    if (coupon.status !== "available" || !coupon.isActive) {
      errors.push("사용할 수 없는 쿠폰입니다.");
    } else if (starts && now < starts) {
      errors.push("아직 사용할 수 없는 쿠폰입니다.");
    } else if (ends && now > ends) {
      errors.push("쿠폰 사용 기간이 지났습니다.");
    } else if (eligibleSubtotal <= 0) {
      errors.push("쿠폰 적용 대상 상품이 없습니다.");
    } else if (eligibleSubtotal < coupon.minOrderAmount) {
      errors.push(`쿠폰은 ${formatKRW(coupon.minOrderAmount)} 이상 구매 시 사용할 수 있습니다.`);
    } else {
      couponDiscount =
        coupon.discountType === "percent"
          ? Math.floor((eligibleSubtotal * coupon.discountValue) / 100)
          : coupon.discountValue;
      if (coupon.maxDiscountAmount != null) {
        couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
      }
      couponDiscount = Math.max(0, Math.min(couponDiscount, eligibleSubtotal));
      const weights = eligibleIndexes.map((index) => lines[index].lineSale);
      const shares = allocateWeights(weights, couponDiscount);
      eligibleIndexes.forEach((lineIndex, shareIndex) => {
        lines[lineIndex].lineCoupon = shares[shareIndex] ?? 0;
      });
    }
  }

  const acceptedCoupon = lines.reduce((sum, line) => sum + line.lineCoupon, 0);
  const afterCoupon = saleSubtotal - acceptedCoupon;
  let pointsUsed = 0;
  const requested = input.pointsToUse;

  if (!Number.isInteger(requested) || requested < 0) {
    errors.push("포인트 금액이 올바르지 않습니다.");
  } else if (requested > 0) {
    if (requested < policy.pointMinUse) {
      errors.push(`포인트는 ${policy.pointMinUse.toLocaleString("ko-KR")}P부터 사용할 수 있습니다.`);
    } else if (requested > input.pointBalance) {
      errors.push("포인트 잔액이 부족합니다.");
    } else if (requested > afterCoupon) {
      errors.push("포인트는 쿠폰 적용 후 상품금액을 초과할 수 없습니다.");
    } else {
      pointsUsed = requested;
      const indexes = lines
        .map((line, index) => (line.lineSale - line.lineCoupon > 0 ? index : -1))
        .filter((index) => index >= 0);
      const weights = indexes.map((index) => lines[index].lineSale - lines[index].lineCoupon);
      const shares = allocateWeights(weights, pointsUsed);
      indexes.forEach((lineIndex, shareIndex) => {
        lines[lineIndex].linePoints = shares[shareIndex] ?? 0;
      });
    }
  }

  for (const line of lines) {
    line.lineBase = line.lineSale - line.lineCoupon - line.linePoints;
    line.lineEarn = Math.floor((line.lineBase * line.pointRateBps) / 10000);
  }

  const merchandise = afterCoupon - pointsUsed;
  const shippingFee = merchandise >= policy.freeShippingThreshold ? 0 : policy.baseShippingFee;
  const total = merchandise + shippingFee;
  const pointsEarned = lines.reduce((sum, line) => sum + line.lineEarn, 0);

  return {
    ok: errors.length === 0,
    errors,
    lines,
    listSubtotal,
    saleSubtotal,
    productDiscount,
    eligibleSubtotal,
    couponDiscount: acceptedCoupon,
    pointsUsed,
    shippingFee,
    total,
    pointsEarned,
  };
}

function timeOf(value: string) {
  return new Date(value).getTime();
}

export function replayPoints(entries: LedgerEntry[], now: Date) {
  const sorted = [...entries].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) return byTime;
    return (a.id ?? "").localeCompare(b.id ?? "");
  });
  const lots: Lot[] = [];

  for (const entry of sorted) {
    if (entry.amount > 0) {
      lots.push({
        remaining: entry.amount,
        expiresAt: entry.expiresAt ? timeOf(entry.expiresAt) : null,
      });
      continue;
    }
    if (entry.amount === 0) continue;
    let need = -entry.amount;
    const at = timeOf(entry.createdAt);
    for (const lot of lots) {
      if (need <= 0) break;
      if (lot.remaining <= 0) continue;
      const expiredWhenUsed = lot.expiresAt !== null && lot.expiresAt <= at;
      if (entry.type === "expire") {
        if (!expiredWhenUsed) continue;
      } else if (expiredWhenUsed) {
        continue;
      }
      const take = Math.min(lot.remaining, need);
      lot.remaining -= take;
      need -= take;
    }
  }

  const nowMs = now.getTime();
  let balance = 0;
  let expiredRemaining = 0;
  for (const lot of lots) {
    if (lot.expiresAt !== null && lot.expiresAt <= nowMs) expiredRemaining += lot.remaining;
    else balance += lot.remaining;
  }
  return { balance, expiredRemaining };
}

export function pointBalance(entries: LedgerEntry[], now = new Date()) {
  return replayPoints(entries, now).balance;
}

export function planCancellation(input: {
  entries: LedgerEntry[];
  pointsUsed: number;
  pointsEarned: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const balance = pointBalance(input.entries, now);
  const restoreAmount = Math.max(0, input.pointsUsed);
  const afterRestore = balance + restoreAmount;
  const clawbackAmount = Math.min(Math.max(0, input.pointsEarned), afterRestore);
  return {
    restoreAmount,
    clawbackAmount,
    unrecoverableEarn: Math.max(0, input.pointsEarned) - clawbackAmount,
    balanceAfter: afterRestore - clawbackAmount,
  };
}
