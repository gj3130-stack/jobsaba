"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discountRate, formatKRW, formatPoint } from "@/lib/format";
import { upsertGuestItem } from "@/lib/guest-cart";
import type { ShopPolicy } from "@/lib/pricing";
import { addToCart, toggleWishlist } from "@/server/shop";

type Variant = {
  id: string;
  sku: string;
  optionName: string;
  listPrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
};

export function ProductPurchase({
  product,
  policy,
  loggedIn,
  wished,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    categoryId: string | null;
    image: string;
    pointRateBps: number;
    variants: Variant[];
  };
  policy: ShopPolicy;
  loggedIn: boolean;
  wished: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [variantId, setVariantId] = useState(product.variants.find((item) => item.active && item.stock > 0)?.id ?? product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [heart, setHeart] = useState(wished);
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const rate = variant ? discountRate(variant.listPrice, variant.salePrice) : 0;
  const soldOut = !variant || !variant.active || variant.stock <= 0;
  const earn = variant ? Math.floor((variant.salePrice * quantity * product.pointRateBps) / 10000) : 0;
  const goods = (variant?.salePrice ?? 0) * quantity;
  const shippingText = useMemo(
    () => `기본 배송비 ${formatKRW(policy.baseShippingFee)} · 쿠폰 적용 후 ${formatKRW(policy.freeShippingThreshold)} 이상 무료`,
    [policy],
  );

  function run(task: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await task();
      setMessage(result.ok ? "" : result.message || "처리하지 못했습니다.");
      if (result.ok) router.refresh();
    });
  }

  function add(buyNow: boolean) {
    if (!variant || soldOut) return;
    if (!loggedIn) {
      if (buyNow) {
        router.push(`/login?next=${encodeURIComponent(`/checkout?buy=${variant.id}&qty=${quantity}`)}`);
        return;
      }
      upsertGuestItem({
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        optionName: variant.optionName,
        sku: variant.sku,
        listPrice: variant.listPrice,
        salePrice: variant.salePrice,
        quantity,
        stock: variant.stock,
        image: product.image,
        categoryId: product.categoryId,
        pointRateBps: product.pointRateBps,
      });
      setMessage("이 브라우저 장바구니에 담았습니다. 결제는 로그인 후 가능합니다.");
      return;
    }
    if (buyNow) {
      router.push(`/checkout?buy=${variant.id}&qty=${quantity}`);
      return;
    }
    run(() => addToCart(variant.id, quantity));
    setMessage("장바구니에 담았습니다.");
  }

  if (!variant) return null;

  const controls = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="옵션">
        {product.variants.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === variant.id}
            disabled={!item.active}
            onClick={() => {
              setVariantId(item.id);
              setQuantity(1);
            }}
            className={`rounded-full px-3 py-2 text-sm ring-1 ${item.id === variant.id ? "bg-ink text-paper ring-ink" : "bg-white ring-line"}`}
          >
            {item.optionName}
            {item.stock <= 0 ? " · 품절" : ""}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm">
          수량
        </label>
        <input
          id="qty"
          className="field w-24"
          type="number"
          min={1}
          max={Math.max(variant.stock, 1)}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Math.min(variant.stock || 1, Number(event.target.value) || 1)))}
        />
        <span className="text-sm text-muted">재고 {variant.stock}</span>
      </div>
      <p className="text-sm text-muted">{shippingText}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>상품 금액</span>
          <span>{formatKRW(goods)}</span>
        </div>
        <div className="flex justify-between">
          <span>적립 예정</span>
          <span>{formatPoint(earn)} · 쿠폰·포인트 사용 전</span>
        </div>
        {rate > 0 ? (
          <div className="flex justify-between text-gochujang">
            <span>상품 할인</span>
            <span>{rate}%</span>
          </div>
        ) : null}
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <div className="hidden gap-2 md:flex">
        <button type="button" className="btn btn-ghost flex-1" disabled={soldOut || pending} onClick={() => add(false)}>
          장바구니
        </button>
        <button type="button" className="btn btn-primary flex-1" disabled={soldOut || pending} onClick={() => add(true)}>
          바로 구매
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            run(async () => {
              const result = await toggleWishlist(product.id);
              if (result.ok) setHeart(result.wished);
              return result;
            })
          }
        >
          {heart ? "찜함" : "찜"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {controls}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper p-3 md:hidden">
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" disabled={soldOut || pending} onClick={() => add(false)}>
            담기
          </button>
          <button type="button" className="btn btn-primary flex-[1.4]" disabled={soldOut || pending} onClick={() => add(true)}>
            {soldOut ? "품절" : formatKRW(goods)}
          </button>
        </div>
      </div>
    </>
  );
}
