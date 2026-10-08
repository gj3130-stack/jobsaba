import Link from "next/link";
import { Flash } from "@/components/ui";
import { loadDashboard } from "@/lib/admin-data";
import { formatKRW } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const dash = await loadDashboard(session.supabase);
  const cards = [
    ["오늘 주문", String(dash.orderCount), "/admin/orders"],
    ["오늘 매출", formatKRW(dash.sales), "/admin/orders"],
    ["오늘 취소", String(dash.cancels), "/admin/cs"],
    ["오늘 환불", `${dash.refunds}건 · ${formatKRW(dash.refundAmount)}`, "/admin/cs"],
    ["미답변 문의", String(dash.openInquiries), "/admin/cs"],
  ];
  return (
    <div>
      <h1 className="serif text-4xl">오늘</h1>
      <p className="mt-2 text-sm text-muted">한국 시간 기준 오늘 0시 이후 주문입니다. 매출은 결제대기와 취소를 빼 집계합니다.</p>
      <div className="mt-4">
        <Flash error={sp.error || dash.error || undefined} />
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, href]) => (
          <li key={label}>
            <Link href={href} className="panel block p-5">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="serif text-2xl">안전재고 이하</h2>
          <Link href="/admin/inventory" className="text-sm text-muted">
            재고
          </Link>
        </div>
        {dash.lowStock.length === 0 ? (
          <p className="panel p-5 text-sm text-muted">안전재고 아래로 내려간 옵션이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {dash.lowStock.map((item) => (
              <li key={item.id} className="panel flex items-center justify-between p-4 text-sm">
                <span>
                  {item.productName} · {item.optionName}
                  <span className="block text-muted">{item.sku}</span>
                </span>
                <span>
                  {item.stock} / {item.safetyStock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
