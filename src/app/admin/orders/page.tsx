import Link from "next/link";
import { Flash } from "@/components/ui";
import { listAdminOrders } from "@/lib/admin-data";
import { formatDateTime, formatKRW } from "@/lib/format";
import { ORDER_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "주문 관리" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const status = sp.status && sp.status in ORDER_STATUS_LABEL ? sp.status : "";
  const { orders, error } = await listAdminOrders(session.supabase, status);
  return (
    <div>
      <h1 className="serif text-4xl">주문</h1>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <form className="mt-4 flex gap-2" method="get">
        <select className="field max-w-xs" name="status" defaultValue={status} aria-label="주문 상태">
          <option value="">전체</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">
          보기
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/admin/orders/${order.id}`} className="panel flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span>
                <span className="font-medium">{order.orderNo}</span>
                <span className="block text-muted">
                  {formatDateTime(order.createdAt)} · {order.buyer} · {order.recipient}
                </span>
              </span>
              <span>
                {labelOf(ORDER_STATUS_LABEL, order.status)} · {formatKRW(order.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
