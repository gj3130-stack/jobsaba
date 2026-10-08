import { notFound } from "next/navigation";
import { Flash } from "@/components/ui";
import { formatDateTime, formatKRW, formatPoint } from "@/lib/format";
import { ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL, labelOf } from "@/lib/labels";
import { getOrder } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { cancelOrder, confirmPurchase, requestReturn, requestTaxDocument, trackShipment } from "@/server/shop";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const { supabase } = await getSession();
  if (!supabase) return <p>Supabase 연결이 필요합니다.</p>;
  const { order } = await getOrder(supabase, orderNo);
  if (!order) notFound();
  const tracking = order.shipment?.trackingNo ? await trackShipment(order.shipment.carrier || "택배", order.shipment.trackingNo) : null;
  const canCancel = ["payment_pending", "paid", "preparing"].includes(order.status);
  const canReturn = ["shipping", "delivered", "confirmed"].includes(order.status);
  return (
    <div className="space-y-5">
      <h1 className="serif text-4xl">{order.orderNo}</h1>
      <Flash notice={sp.notice} error={sp.error} />
      <p>
        {labelOf(ORDER_STATUS_LABEL, order.status)} · {formatDateTime(order.createdAt)} · {formatKRW(order.total)}
      </p>
      <ul className="panel divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 p-4 text-sm">
            <span>
              {item.productName} · {item.optionName} · {item.quantity}개
            </span>
            <span>{formatKRW(item.salePrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="panel space-y-1 p-4 text-sm">
        <p>상품 금액 {formatKRW(order.listSubtotal)}</p>
        <p>상품 할인 -{formatKRW(order.productDiscount)}</p>
        <p>쿠폰 -{formatKRW(order.couponDiscount)} {order.couponSnapshot?.name ? `(${order.couponSnapshot.name})` : ""}</p>
        <p>포인트 -{formatPoint(order.pointsUsed)}</p>
        <p>배송비 {formatKRW(order.shippingFee)}</p>
        <p>적립 {formatPoint(order.pointsEarned)}</p>
      </div>
      <div className="panel p-4 text-sm leading-6">
        <p>{order.recipient} · {order.phone}</p>
        <p>({order.postalCode}) {order.address1} {order.address2}</p>
        {order.memo ? <p>메모 {order.memo}</p> : null}
        {order.shipment ? (
          <p>
            배송 {labelOf(SHIPMENT_STATUS_LABEL, order.shipment.status)} {order.shipment.carrier} {order.shipment.trackingNo}
          </p>
        ) : null}
        {tracking?.ok ? <p>{tracking.summary}</p> : null}
      </div>
      {canCancel ? (
        <form action={cancelOrder} className="panel space-y-2 p-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="orderNo" value={order.orderNo} />
          <textarea className="field" name="reason" placeholder="취소 사유" />
          <button className="btn btn-primary" type="submit">주문 취소</button>
        </form>
      ) : null}
      {canReturn ? (
        <form action={requestReturn} className="panel space-y-2 p-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="orderNo" value={order.orderNo} />
          <textarea className="field" name="reason" required placeholder="반품 사유" />
          <button className="btn btn-ghost" type="submit">반품 요청</button>
        </form>
      ) : null}
      {order.status === "delivered" ? (
        <form action={confirmPurchase}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="orderNo" value={order.orderNo} />
          <button className="btn btn-primary" type="submit">구매 확정</button>
        </form>
      ) : null}
      <form action={requestTaxDocument} className="panel space-y-2 p-4">
        <p className="text-sm font-medium">현금영수증·세금계산서 요청 (모의)</p>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="orderNo" value={order.orderNo} />
        <select className="field" name="docType" aria-label="문서 종류">
          <option value="cash_receipt">현금영수증</option>
          <option value="tax_invoice">세금계산서</option>
        </select>
        <input className="field" name="identity" placeholder="휴대폰 번호 또는 사업자번호" />
        <input className="field" name="email" type="email" placeholder="수신 이메일" />
        <button className="btn btn-ghost" type="submit">요청</button>
      </form>
    </div>
  );
}
