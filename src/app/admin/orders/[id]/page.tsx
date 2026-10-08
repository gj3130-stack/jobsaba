import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/ui";
import { getAdminOrder } from "@/lib/admin-data";
import { formatDateTime, formatKRW, formatPoint } from "@/lib/format";
import { CARRIERS, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, RETURN_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { setOrderStatus } from "@/server/admin";

export const metadata = { title: "주문 상세" };

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { order } = await getAdminOrder(session.supabase, id);
  if (!order) notFound();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{formatDateTime(order.createdAt)}</p>
        <h1 className="serif text-4xl">{order.orderNo}</h1>
        <p className="mt-1 text-sm">
          {labelOf(ORDER_STATUS_LABEL, order.status)} · {order.buyer} {order.email ? `(${order.email})` : ""}
        </p>
      </div>
      <Flash notice={sp.notice} error={sp.error} />
      <section className="panel p-5 text-sm leading-6">
        <p>
          {order.recipient} · {order.phone}
        </p>
        <p>
          ({order.postalCode}) {order.address1} {order.address2}
        </p>
        {order.memo ? <p className="text-muted">고객 메모: {order.memo}</p> : null}
        <p className="mt-3">상품할인 {formatKRW(order.productDiscount)} · 쿠폰 {formatKRW(order.couponDiscount)} · 포인트 {formatPoint(order.pointsUsed)}</p>
        <p>
          배송비 {formatKRW(order.shippingFee)} · 결제 {formatKRW(order.total)} · 적립 {formatPoint(order.pointsEarned)}
        </p>
      </section>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.id} className="panel flex justify-between p-4 text-sm">
            <span>
              {item.productName} · {item.optionName}
              <span className="block text-muted">{item.sku}</span>
            </span>
            <span>
              {formatKRW(item.salePrice)} × {item.quantity}
            </span>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="font-semibold">결제</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {order.payments.map((payment) => (
            <li key={payment.id} className="panel p-4">
              {payment.provider} · {payment.method} · {labelOf(PAYMENT_STATUS_LABEL, payment.status)} · {formatKRW(payment.amount)}
              <span className="block text-muted">{payment.transactionId || "거래번호 없음"}</span>
            </li>
          ))}
        </ul>
      </section>
      {order.returns.length > 0 ? (
        <section>
          <h2 className="font-semibold">취소·반품 이력</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {order.returns.map((item) => (
              <li key={item.id} className="panel p-4">
                {item.type} · {labelOf(RETURN_STATUS_LABEL, item.status)} · {formatDateTime(item.createdAt)}
                <span className="block text-muted">{item.reason}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/cs" className="mt-2 inline-block text-sm text-muted">
            고객센터에서 반품 처리
          </Link>
        </section>
      ) : null}
      <form action={setOrderStatus} className="panel grid gap-3 p-5 md:grid-cols-2">
        <input type="hidden" name="orderId" value={order.id} />
        <label className="text-sm">
          상태
          <select className="field mt-1" name="status" defaultValue={order.status === "payment_pending" ? "paid" : order.status}>
            <option value="paid">결제완료</option>
            <option value="preparing">상품준비</option>
            <option value="shipping">배송중</option>
            <option value="delivered">배송완료</option>
            <option value="confirmed">구매확정</option>
            <option value="cancelled">취소</option>
          </select>
        </label>
        <label className="text-sm">
          택배사
          <select className="field mt-1" name="carrier" defaultValue={order.carrier || CARRIERS[0]}>
            {CARRIERS.map((carrier) => (
              <option key={carrier}>{carrier}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          송장번호
          <input className="field mt-1" name="tracking" defaultValue={order.trackingNo} />
        </label>
        <label className="text-sm">
          관리 메모
          <input className="field mt-1" name="memo" defaultValue={order.adminMemo} />
        </label>
        <div className="md:col-span-2">
          <button className="btn btn-primary" type="submit">
            상태 저장
          </button>
        </div>
      </form>
    </div>
  );
}
