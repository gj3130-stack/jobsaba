import { describe, expect, it } from "vitest";
import { estimateShipDate, inferStorageType } from "@/lib/shipping";

describe("estimateShipDate", () => {
  it("평일 14시 전 결제는 당일 출고", () => {
    // 2026-10-08(목) 10:00 KST
    const result = estimateShipDate("room", new Date("2026-10-08T01:00:00Z"));
    expect(result.today).toBe(true);
    expect(result.label).toBe("10/8(목)");
  });

  it("냉장 상품은 금요일에 출고하지 않고 월요일로 넘긴다", () => {
    // 2026-10-08(목) 15:00 KST → 다음 날 금요일은 냉장 출고 불가 → 10/12(월)
    const result = estimateShipDate("refrigerated", new Date("2026-10-08T06:00:00Z"));
    expect(result.label).toBe("10/12(월)");
  });

  it("상온 상품은 금요일 출고 가능", () => {
    const result = estimateShipDate("room", new Date("2026-10-08T06:00:00Z"));
    expect(result.label).toBe("10/9(금)");
  });
});

describe("inferStorageType", () => {
  it("보관 문구로 보관유형을 추정한다", () => {
    expect(inferStorageType("냉장 보관")).toBe("refrigerated");
    expect(inferStorageType("0~10℃ 냉장 보관. 개봉 후에는 덜어 드세요")).toBe("refrigerated");
    expect(inferStorageType("개봉 전 상온, 개봉 후 냉장 보관")).toBe("room");
    expect(inferStorageType("-18℃ 이하 냉동 보관")).toBe("frozen");
  });
});
