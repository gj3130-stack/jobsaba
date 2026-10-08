import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKRW } from "@/lib/format";
import { ORDER_STATUS_LABEL, labelOf } from "@/lib/labels";
import { getOrder } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "주문 완료" };

export default async function OrderCompletePage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const { supabase } = await getSession();
  if (!supabase) return <p>Supabase 연결이 필요합니다.</p>;
  const { order } = await getOrder(supabase, orderNo);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-xl py-10">
      <p className="text-sm text-gochujang">모의 결제가 완료되었습니다.</p>
      <h1 className="serif mt-2 text-4xl">주문번호 {order.orderNo}</h1>
      <p className="mt-3 text-sm">상태 {labelOf(ORDER_STATUS_LABEL, order.status)} · {formatKRW(order.total)}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.productName} · {item.optionName} · {item.quantity}개
          </li>
        ))}
      </ul>
      <Link href={`/my/orders/${order.orderNo}`} className="btn btn-primary mt-6">
        주문 상세
      </Link>
    </div>
  );
}
