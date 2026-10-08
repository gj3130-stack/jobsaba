import Link from "next/link";

export const SORTS = [
  { value: "", label: "판매순" },
  { value: "new", label: "신상품순" },
  { value: "review", label: "리뷰많은순" },
  { value: "price_asc", label: "낮은가격순" },
  { value: "price_desc", label: "높은가격순" },
];

function href(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `${base}?${text}` : base;
}

export function Chips({ base, items, active, keep = {} }: { base: string; items: { value: string; label: string }[]; active: string; keep?: Record<string, string | undefined> }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {items.map((item) => {
        const on = item.value === active;
        return (
          <Link
            key={item.value || "all"}
            href={href(base, { ...keep, tag: item.value || undefined })}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-ink text-white" : "bg-paper text-ink ring-1 ring-line hover:ring-ink"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Toolbar({ base, count, sort, keep = {} }: { base: string; count: number; sort: string; keep?: Record<string, string | undefined> }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm">
      <p className="shrink-0 text-muted">
        총 <span className="font-bold text-ink">{count}</span>개
      </p>
      <div className="scrollbar-none flex gap-3 overflow-x-auto md:gap-4">
        {SORTS.map((item) => (
          <Link
            key={item.value || "default"}
            href={href(base, { ...keep, sort: item.value || undefined })}
            className={`shrink-0 ${item.value === sort ? "font-bold text-ink" : "text-muted hover:text-ink"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
