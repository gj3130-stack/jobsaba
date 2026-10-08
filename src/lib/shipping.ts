import type { StorageType } from "@/lib/models";

/** PRD 7A/7C 기본값 (임시). DB가 연결되면 shop_settings 값이 우선한다. */
export const SHIPPING_DEFAULTS = {
  baseShippingFee: 3500,
  freeShippingThreshold: 30000,
  jejuExtraFee: 3000,
  remoteExtraFee: 5000,
  cutoffHour: 14,
} as const;

export const STORAGE_LABEL: Record<StorageType, string> = {
  room: "상온",
  refrigerated: "냉장",
  frozen: "냉동",
};

export function inferStorageType(text: string | null | undefined): StorageType {
  const value = (text ?? "").trim();
  if (/^(-18|냉동)/.test(value)) return "frozen";
  if (/^(0~|냉장)/.test(value)) return "refrigerated";
  if (/냉동/.test(value) && !/냉장/.test(value)) return "frozen";
  if (/냉장/.test(value) && !/개봉\s?후/.test(value)) return "refrigerated";
  return "room";
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function kstParts(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth(), day: kst.getUTCDate(), hour: kst.getUTCHours(), weekday: kst.getUTCDay() };
}

/**
 * 예상 출고일 (KST).
 * - 평일 14:00 이전 결제는 당일 출고, 이후는 다음 출고 가능일.
 * - 냉장·냉동 상품은 금·토·일 출고하지 않는다 (PRD 7C, 임시). 공휴일은 운영 설정으로 따로 관리한다.
 */
export function estimateShipDate(storage: StorageType, now: Date = new Date()) {
  const start = kstParts(now);
  const cold = storage !== "room";
  const blocked = (weekday: number) => weekday === 0 || weekday === 6 || (cold && weekday === 5);
  let offset = start.hour < SHIPPING_DEFAULTS.cutoffHour ? 0 : 1;
  for (let guard = 0; guard < 14; guard += 1) {
    const weekday = (start.weekday + offset) % 7;
    if (!blocked(weekday)) break;
    offset += 1;
  }
  const ship = new Date(Date.UTC(start.year, start.month, start.day + offset));
  const label = `${ship.getUTCMonth() + 1}/${ship.getUTCDate()}(${WEEKDAY[ship.getUTCDay()]})`;
  return { offset, label, today: offset === 0 };
}
