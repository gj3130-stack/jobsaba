import { describe, expect, it } from "vitest";
import {
  allocateWeights,
  calculateOrder,
  planCancellation,
  pointBalance,
  replayPoints,
  type CouponPolicy,
  type LedgerEntry,
  type PricingItem,
} from "@/lib/pricing";

function item(overrides: Partial<PricingItem> = {}): PricingItem {
  return {
    variantId: "v-a",
    productId: "p-a",
    categoryId: "cat-jang",
    name: "햇살 재래 된장",
    optionName: "1kg",
    sku: "JS-DOEN-1",
    listPrice: 15900,
    salePrice: 13900,
    quantity: 2,
    stock: 20,
    productStatus: "on_sale",
    variantActive: true,
    pointRateBps: 100,
    ...overrides,
  };
}

function coupon(overrides: Partial<CouponPolicy> = {}): CouponPolicy {
  return {
    userCouponId: "uc-1",
    couponId: "c-1",
    name: "장류 10%",
    code: "PANTRY10",
    discountType: "percent",
    discountValue: 10,
    minOrderAmount: 30000,
    maxDiscountAmount: 5000,
    categoryId: null,
    productId: null,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-12-31T00:00:00.000Z",
    status: "available",
    isActive: true,
    ...overrides,
  };
}

const now = new Date("2026-06-01T00:00:00.000Z");

describe("allocateWeights", () => {
  it("배분 합이 총액과 같고 각 몫은 가중치를 넘지 않는다", () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let n = 0; n < 40; n += 1) {
      const weights = Array.from({ length: 1 + Math.floor(rand() * 5) }, () => 1 + Math.floor(rand() * 50000));
      const sum = weights.reduce((a, b) => a + b, 0);
      const total = Math.floor(rand() * (sum + 1));
      const shares = allocateWeights(weights, total);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
      shares.forEach((share, index) => {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(weights[index]);
      });
    }
  });
});

describe("calculateOrder", () => {
  it("상품할인 다음 정률 쿠폰, 포인트, 배송비 순서로 계산한다", () => {
    const quote = calculateOrder({
      items: [item()],
      coupon: coupon({ minOrderAmount: 20000 }),
      pointsToUse: 1000,
      pointBalance: 5000,
      now,
    });
    expect(quote.ok).toBe(true);
    expect(quote.listSubtotal).toBe(31800);
    expect(quote.saleSubtotal).toBe(27800);
    expect(quote.productDiscount).toBe(4000);
    expect(quote.couponDiscount).toBe(2780);
    expect(quote.pointsUsed).toBe(1000);
    expect(quote.shippingFee).toBe(3000);
    expect(quote.total).toBe(27020);
    expect(quote.pointsEarned).toBe(240);
  });

  it("카테고리 쿠폰은 대상 상품에만 배분하고 적립률을 라인별로 적용한다", () => {
    const quote = calculateOrder({
      items: [
        item({
          variantId: "b",
          productId: "p-b",
          categoryId: "cat-sauce",
          name: "만능 양념장",
          salePrice: 20000,
          listPrice: 20000,
          quantity: 1,
          pointRateBps: 200,
        }),
        item({
          variantId: "a",
          salePrice: 10000,
          listPrice: 10000,
          quantity: 1,
          pointRateBps: 100,
        }),
      ],
      coupon: coupon({
        discountType: "fixed",
        discountValue: 3000,
        minOrderAmount: 5000,
        maxDiscountAmount: null,
        categoryId: "cat-jang",
      }),
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(quote.ok).toBe(true);
    expect(quote.eligibleSubtotal).toBe(10000);
    expect(quote.couponDiscount).toBe(3000);
    const doenjang = quote.lines.find((line) => line.variantId === "a");
    const sauce = quote.lines.find((line) => line.variantId === "b");
    expect(doenjang?.lineCoupon).toBe(3000);
    expect(sauce?.lineCoupon).toBe(0);
    expect(quote.pointsEarned).toBe(70 + 400);
    expect(quote.shippingFee).toBe(3000);
    expect(quote.total).toBe(30000);
  });

  it("쿠폰과 포인트를 결제 대상 금액 비율로 나눈다", () => {
    const quote = calculateOrder({
      items: [
        item({
          variantId: "a",
          categoryId: "cat-1",
          salePrice: 10000,
          listPrice: 10000,
          quantity: 1,
        }),
        item({
          variantId: "b",
          productId: "p-b",
          categoryId: "cat-2",
          name: "양념장",
          salePrice: 30000,
          listPrice: 30000,
          quantity: 1,
        }),
      ],
      coupon: coupon({
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountAmount: null,
        categoryId: "cat-1",
      }),
      pointsToUse: 4000,
      pointBalance: 10000,
      now,
    });
    expect(quote.ok).toBe(true);
    expect(quote.couponDiscount).toBe(1000);
    expect(quote.lines.find((line) => line.variantId === "a")?.linePoints).toBe(923);
    expect(quote.lines.find((line) => line.variantId === "b")?.linePoints).toBe(3077);
    expect(quote.pointsEarned).toBe(349);
    expect(quote.total).toBe(38000);
  });

  it("기준 금액 이상이면 배송비가 없고, 쿠폰으로 기준 아래가 되면 배송비가 붙는다", () => {
    const free = calculateOrder({
      items: [item({ salePrice: 40000, listPrice: 40000, quantity: 1 })],
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(free.shippingFee).toBe(0);
    expect(free.total).toBe(40000);
    expect(free.pointsEarned).toBe(400);

    const charged = calculateOrder({
      items: [item({ salePrice: 43000, listPrice: 43000, quantity: 1 })],
      coupon: coupon({
        discountType: "fixed",
        discountValue: 3001,
        minOrderAmount: 0,
        maxDiscountAmount: null,
      }),
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(charged.couponDiscount).toBe(3001);
    expect(charged.shippingFee).toBe(3000);
    expect(charged.total).toBe(42999);
  });

  it("정액·정률 쿠폰은 대상 금액과 최대 할인으로 제한된다", () => {
    const fixed = calculateOrder({
      items: [item({ salePrice: 2000, listPrice: 2000, quantity: 1 })],
      coupon: coupon({
        discountType: "fixed",
        discountValue: 5000,
        minOrderAmount: 0,
        maxDiscountAmount: null,
      }),
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(fixed.couponDiscount).toBe(2000);

    const capped = calculateOrder({
      items: [item({ salePrice: 100000, listPrice: 100000, quantity: 1 })],
      coupon: coupon({ discountValue: 20, minOrderAmount: 0, maxDiscountAmount: 5000 }),
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(capped.couponDiscount).toBe(5000);
    expect(capped.shippingFee).toBe(0);
    expect(capped.total).toBe(95000);
  });

  it("포인트는 최소 사용액, 잔액, 상품금액을 넘을 수 없다", () => {
    const base = {
      items: [item({ salePrice: 20000, listPrice: 20000, quantity: 1 })],
      now,
      pointBalance: 5000,
    };
    expect(calculateOrder({ ...base, pointsToUse: 0 }).ok).toBe(true);
    expect(calculateOrder({ ...base, pointsToUse: 1000 }).ok).toBe(true);
    expect(calculateOrder({ ...base, pointsToUse: 999 }).errors.join(" ")).toContain("1,000P");
    expect(calculateOrder({ ...base, pointsToUse: 6000 }).errors.join(" ")).toContain("잔액");
    expect(calculateOrder({ ...base, pointsToUse: 20000, pointBalance: 30000 }).total).toBe(3000);
    expect(
      calculateOrder({ ...base, pointsToUse: 20001, pointBalance: 30000 }).errors.join(" "),
    ).toContain("초과");
  });

  it("같은 옵션은 수량을 합치고 재고·판매상태를 확인한다", () => {
    const merged = calculateOrder({
      items: [item({ quantity: 2, stock: 5 }), item({ quantity: 2, stock: 5 })],
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(merged.ok).toBe(true);
    expect(merged.lines[0]?.quantity).toBe(4);

    const stock = calculateOrder({
      items: [item({ quantity: 3, stock: 2 })],
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(stock.ok).toBe(false);
    expect(stock.errors.join(" ")).toContain("재고");

    for (const status of ["sold_out", "hidden", "stopped"] as const) {
      const quote = calculateOrder({
        items: [item({ productStatus: status, quantity: 1 })],
        pointsToUse: 0,
        pointBalance: 0,
        now,
      });
      expect(quote.ok).toBe(false);
    }

    const inactive = calculateOrder({
      items: [item({ variantActive: false, quantity: 1 })],
      pointsToUse: 0,
      pointBalance: 0,
      now,
    });
    expect(inactive.ok).toBe(false);
  });

  it("기간, 상태, 최소금액, 대상이 맞지 않는 쿠폰은 할인하지 않는다", () => {
    const base = {
      items: [item({ quantity: 1, salePrice: 10000, listPrice: 10000 })],
      pointsToUse: 0,
      pointBalance: 0,
      now,
    };
    expect(calculateOrder({ ...base, coupon: coupon({ status: "used", minOrderAmount: 0 }) }).couponDiscount).toBe(0);
    expect(calculateOrder({ ...base, coupon: coupon({ endsAt: "2026-05-01T00:00:00.000Z", minOrderAmount: 0 }) }).errors.join(" ")).toContain("기간");
    expect(calculateOrder({ ...base, coupon: coupon({ startsAt: "2026-07-01T00:00:00.000Z", minOrderAmount: 0 }) }).errors.join(" ")).toContain("아직");
    expect(calculateOrder({ ...base, coupon: coupon({ minOrderAmount: 20000 }) }).errors.join(" ")).toContain("이상");
    expect(
      calculateOrder({
        ...base,
        coupon: coupon({ productId: "other", minOrderAmount: 0 }),
      }).errors.join(" "),
    ).toContain("대상");
  });
});

describe("point ledger", () => {
  const earn = (amount: number, createdAt: string, expiresAt: string | null, id: string): LedgerEntry => ({
    id,
    type: "earn",
    amount,
    createdAt,
    expiresAt,
  });

  it("만료된 적립은 잔액에서 빠지고 사용은 미만료 로트만 FIFO로 소모한다", () => {
    const nowDate = new Date("2026-06-15T00:00:00.000Z");
    const expired = replayPoints(
      [
        earn(5000, "2025-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z", "1"),
        earn(2000, "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "2"),
      ],
      nowDate,
    );
    expect(expired.balance).toBe(2000);
    expect(expired.expiredRemaining).toBe(5000);

    const used = replayPoints(
      [
        earn(1000, "2026-01-01T00:00:00.000Z", "2026-06-20T00:00:00.000Z", "1"),
        earn(5000, "2026-02-01T00:00:00.000Z", "2026-12-01T00:00:00.000Z", "2"),
        { id: "3", type: "use", amount: -1500, createdAt: "2026-03-01T00:00:00.000Z" },
      ],
      new Date("2026-03-02T00:00:00.000Z"),
    );
    expect(used.balance).toBe(4500);

    const skipExpired = replayPoints(
      [
        earn(1000, "2026-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z", "1"),
        earn(2000, "2026-02-01T00:00:00.000Z", "2027-02-01T00:00:00.000Z", "2"),
        { id: "3", type: "use", amount: -1500, createdAt: "2026-06-10T00:00:00.000Z" },
      ],
      new Date("2026-06-11T00:00:00.000Z"),
    );
    expect(skipExpired.balance).toBe(500);
    expect(skipExpired.expiredRemaining).toBe(1000);
  });

  it("만료 원장은 이미 만료된 로트만 차감한다", () => {
    const result = replayPoints(
      [
        earn(5000, "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "1"),
        earn(1000, "2026-02-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z", "2"),
        { id: "3", type: "expire", amount: -1000, createdAt: "2026-03-02T00:00:00.000Z" },
      ],
      new Date("2026-04-01T00:00:00.000Z"),
    );
    expect(result.balance).toBe(5000);
    expect(result.expiredRemaining).toBe(0);
    expect(
      pointBalance(
        [
          earn(1000, "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "1"),
          { id: "2", type: "use", amount: -1000, createdAt: "2026-02-01T00:00:00.000Z" },
          { id: "3", type: "restore", amount: 1000, createdAt: "2026-03-01T00:00:00.000Z", expiresAt: "2027-03-01T00:00:00.000Z" },
        ],
        new Date("2026-04-01T00:00:00.000Z"),
      ),
    ).toBe(1000);
  });

  it("취소 시 사용 포인트를 복원하고 적립분은 잔액 한도에서 회수한다", () => {
    const entries: LedgerEntry[] = [
      earn(500, "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "1"),
    ];
    expect(
      planCancellation({ entries, pointsUsed: 1000, pointsEarned: 200, now: new Date("2026-06-01T00:00:00.000Z") }),
    ).toEqual({
      restoreAmount: 1000,
      clawbackAmount: 200,
      unrecoverableEarn: 0,
      balanceAfter: 1300,
    });
    expect(
      planCancellation({ entries, pointsUsed: 0, pointsEarned: 500, now: new Date("2026-06-01T00:00:00.000Z") }),
    ).toMatchObject({ clawbackAmount: 500, unrecoverableEarn: 0, balanceAfter: 0 });
    expect(
      planCancellation({
        entries: [earn(100, "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z", "1")],
        pointsUsed: 0,
        pointsEarned: 500,
        now: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toMatchObject({ clawbackAmount: 100, unrecoverableEarn: 400, balanceAfter: 0 });
  });
});
