import Link from "next/link";
import { Flash } from "@/components/ui";
import { formatDateTime, formatKRW } from "@/lib/format";
import { ORDER_STATUS_LABEL, labelOf } from "@/lib/labels";
import { listOrders } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "주문내역" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { orders, error } = supabase && user ? await listOrders(supabase, user.id) : { orders: [], error: null };
  return (
    <div>
      <h1 className="serif text-4xl">주문</h1>
      <div className="mt-4"><Flash notice={sp.notice} error={sp.error || error || undefined} /></div>
      <ul className="mt-4 space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/my/orders/${order.orderNo}`} className="panel block p-4">
              <p className="text-sm text-muted">{formatDateTime(order.createdAt)} · {order.orderNo}</p>
              <p className="mt-1 font-medium">{labelOf(ORDER_STATUS_LABEL, order.status)} · {formatKRW(order.total)}</p>
              <p className="mt-1 text-sm text-muted">{order.items.map((item) => item.productName).join(", ")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
