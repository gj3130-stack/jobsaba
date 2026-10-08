import Link from "next/link";
import { Flash } from "@/components/ui";
import { listDelivery } from "@/lib/admin-data";
import { CARRIERS, ORDER_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { issueMockTracking } from "@/server/admin";

export const metadata = { title: "배송" };

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { orders, error } = await listDelivery(session.supabase);
  return (
    <div>
      <h1 className="serif text-4xl">배송</h1>
      <p className="mt-2 text-sm text-muted">모의 택배 어댑터가 운송장 번호를 만들고 주문을 배송중으로 바꿉니다. 실제 택배사 조회는 하지 않습니다.</p>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <ul className="mt-4 space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              <Link href={`/admin/orders/${order.id}`} className="font-medium">
                {order.orderNo}
              </Link>
              <span className="block text-muted">
                {order.recipient} · {labelOf(ORDER_STATUS_LABEL, order.status)}
                {order.trackingNo ? ` · ${order.carrier} ${order.trackingNo}` : ""}
              </span>
            </span>
            <form action={issueMockTracking} className="flex gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="orderNo" value={order.orderNo} />
              <select className="field" name="carrier" defaultValue={order.carrier || CARRIERS[0]} aria-label="택배사">
                {CARRIERS.map((carrier) => (
                  <option key={carrier}>{carrier}</option>
                ))}
              </select>
              <button className="btn btn-primary" type="submit">
                모의 송장
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
