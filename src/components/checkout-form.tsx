"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKRW, formatPoint } from "@/lib/format";
import type { Address } from "@/lib/models";
import { calculateOrder, type CouponPolicy, type PricingItem, type ShopPolicy } from "@/lib/pricing";
import { placeOrder } from "@/server/shop";

export function CheckoutForm({
  items,
  coupons,
  balance,
  policy,
  addresses,
}: {
  items: PricingItem[];
  coupons: CouponPolicy[];
  balance: number;
  policy: ShopPolicy;
  addresses: Address[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [couponId, setCouponId] = useState("");
  const [points, setPoints] = useState(0);
  const [addressId, setAddressId] = useState(addresses.find((item) => item.isDefault)?.id ?? "");
  const [message, setMessage] = useState("");
  const selectedAddress = addresses.find((item) => item.id === addressId);
  const coupon = coupons.find((item) => item.userCouponId === couponId) ?? null;
  const quote = useMemo(
    () => calculateOrder({ items, coupon, pointsToUse: points, pointBalance: balance, policy }),
    [items, coupon, points, balance, policy],
  );

  function submit(formData: FormData) {
    const method = String(formData.get("method") || "mock_card");
    const address = {
      recipient: String(formData.get("recipient") || ""),
      phone: String(formData.get("phone") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      address1: String(formData.get("address1") || ""),
      address2: String(formData.get("address2") || ""),
      memo: String(formData.get("memo") || ""),
    };
    start(async () => {
      const result = await placeOrder({
        lines: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        address,
        saveAddress: formData.get("saveAddress") === "on",
        userCouponId: couponId || null,
        pointsToUse: points,
        method,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push(`/order/complete/${result.orderNo}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">배송지</h2>
          {addresses.length > 0 ? (
            <select className="field" value={addressId} onChange={(event) => setAddressId(event.target.value)} aria-label="저장된 배송지">
              <option value="">직접 입력</option>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label || address.recipient} · {address.address1}
                </option>
              ))}
            </select>
          ) : null}
          <input className="field" name="recipient" required placeholder="받는 사람" defaultValue={selectedAddress?.recipient} key={`r-${addressId}`} />
          <input className="field" name="phone" required placeholder="전화번호" defaultValue={selectedAddress?.phone} key={`p-${addressId}`} />
          <input className="field" name="postalCode" required placeholder="우편번호" defaultValue={selectedAddress?.postalCode} key={`z-${addressId}`} />
          <input className="field" name="address1" required placeholder="주소" defaultValue={selectedAddress?.address1} key={`a-${addressId}`} />
          <input className="field" name="address2" placeholder="상세 주소" defaultValue={selectedAddress?.address2} key={`b-${addressId}`} />
          <textarea className="field min-h-24" name="memo" placeholder="배송 메모" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="saveAddress" /> 이 배송지 저장
          </label>
          <p className="text-xs text-muted">우편번호는 직접 입력합니다. 주소 검색 API는 연결되어 있지 않습니다.</p>
        </section>
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">쿠폰 · 포인트</h2>
          <select className="field" value={couponId} onChange={(event) => setCouponId(event.target.value)} aria-label="쿠폰">
            <option value="">쿠폰 없음 (주문당 1장)</option>
            {coupons.map((item) => (
              <option key={item.userCouponId} value={item.userCouponId} disabled={item.status !== "available"}>
                {item.name} · {item.code}
              </option>
            ))}
          </select>
          <label className="block text-sm">
            포인트 사용 · 보유 {formatPoint(balance)} · {policy.pointMinUse.toLocaleString("ko-KR")}P부터
            <input
              className="field mt-1"
              type="number"
              min={0}
              step={100}
              value={points}
              onChange={(event) => setPoints(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
        </section>
        <section className="panel space-y-2 p-5">
          <h2 className="font-semibold">결제 수단</h2>
          <label className="flex gap-2 text-sm"><input type="radio" name="method" value="mock_card" defaultChecked /> 신용카드 (모의)</label>
          <label className="flex gap-2 text-sm"><input type="radio" name="method" value="mock_transfer" /> 계좌이체 (모의)</label>
          <label className="flex gap-2 text-sm"><input type="radio" name="method" value="mock_fail" /> 실패 테스트</label>
        </section>
      </div>
      <aside className="panel h-fit space-y-2 p-5 text-sm">
        <h2 className="font-semibold">결제 금액</h2>
        <Row label="상품 금액" value={formatKRW(quote.listSubtotal)} />
        <Row label="상품 할인" value={`-${formatKRW(quote.productDiscount)}`} />
        <Row label="쿠폰" value={`-${formatKRW(quote.couponDiscount)}`} />
        <Row label="포인트" value={`-${formatPoint(quote.pointsUsed)}`} />
        <Row label="배송비" value={formatKRW(quote.shippingFee)} />
        <p className="serif pt-2 text-3xl">{formatKRW(quote.total)}</p>
        <p className="text-xs text-muted">적립 예정 {formatPoint(quote.pointsEarned)} · 서버에서 가격을 다시 확인합니다.</p>
        {quote.errors.map((error) => (
          <p key={error} className="text-gochujang">
            {error}
          </p>
        ))}
        {message ? <p className="text-gochujang">{message}</p> : null}
        <button className="btn btn-primary w-full" disabled={pending || !quote.ok} type="submit">
          {pending ? "결제 중" : "모의 결제"}
        </button>
      </aside>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </p>
  );
}
