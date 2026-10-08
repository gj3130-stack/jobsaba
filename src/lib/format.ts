export function formatKRW(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatPoint(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}P`;
}

export function discountRate(listPrice: number, salePrice: number) {
  if (listPrice <= 0 || salePrice >= listPrice) return 0;
  return Math.round(((listPrice - salePrice) / listPrice) * 100);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function startOfTodayKstIso() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}
