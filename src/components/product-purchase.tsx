"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CartIcon, HeartIcon, MinusIcon, PlusIcon } from "@/components/icons";
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
  checkoutReady,
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
  checkoutReady: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [variantId, setVariantId] = useState(product.variants.find((item) => item.active && item.stock > 0)?.id ?? product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; cart?: boolean } | null>(null);
  const [heart, setHeart] = useState(wished);
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const soldOut = !variant || !variant.active || variant.stock <= 0;
  const goods = (variant?.salePrice ?? 0) * quantity;
  const earn = Math.floor((goods * product.pointRateBps) / 10000);
  const shipping = goods >= policy.freeShippingThreshold ? 0 : policy.baseShippingFee;
  const left = Math.max(0, policy.freeShippingThreshold - goods);

  function addGuest() {
    if (!variant) return;
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
  }

  function add(buyNow: boolean) {
    if (!variant || soldOut) return;
    if (!loggedIn) {
      if (buyNow) {
        if (checkoutReady) {
          router.push(`/login?next=${encodeURIComponent(`/checkout?buy=${variant.id}&qty=${quantity}`)}`);
        } else {
          addGuest();
          router.push("/cart");
        }
        return;
      }
      addGuest();
      setMessage({ text: "장바구니에 담았어요.", cart: true });
      return;
    }
    if (buyNow) {
      router.push(`/checkout?buy=${variant.id}&qty=${quantity}`);
      return;
    }
    start(async () => {
      const result = await addToCart(variant.id, quantity);
      setMessage(result.ok ? { text: "장바구니에 담았어요.", cart: true } : { text: result.message || "담지 못했어요. 다시 시도해 주세요." });
      if (result.ok) router.refresh();
    });
  }

  function wish() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.slug}`)}`);
      return;
    }
    start(async () => {
      const result = await toggleWishlist(product.id);
      if (result.ok) setHeart(result.wished);
      else setMessage({ text: result.message || "찜하지 못했어요." });
    });
  }

  if (!variant) return null;

  return (
    <>
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-bold">옵션 선택</legend>
          <div className="grid gap-2" role="radiogroup" aria-label="옵션">
            {product.variants.map((item) => {
              const on = item.id === variant.id;
              const off = !item.active || item.stock <= 0;
              const rate = discountRate(item.listPrice, item.salePrice);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={off}
                  onClick={() => {
                    setVariantId(item.id);
                    setQuantity(1);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                    on ? "bg-white ring-2 ring-ink" : "bg-white ring-1 ring-line hover:ring-ink/40"
                  } ${off ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ring-2 ${on ? "ring-gochujang" : "ring-line"}`}>
                      {on ? <span className="h-2 w-2 rounded-full bg-gochujang" /> : null}
                    </span>
                    <span className="font-semibold">{item.optionName}</span>
                    {off ? <span className="text-xs text-muted">품절</span> : null}
                  </span>
                  <span className="shrink-0 text-right">
                    {rate > 0 ? <span className="mr-1.5 text-xs font-bold text-gochujang">{rate}%</span> : null}
                    <span className="font-bold">{formatKRW(item.salePrice)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{variant.optionName}</p>
            <p className="text-xs text-muted">{variant.stock > 0 && variant.stock <= 10 ? `남은 수량 ${variant.stock}개` : "바로 출고 가능"}</p>
          </div>
          <div className="flex items-center rounded-full bg-white ring-1 ring-line">
            <button type="button" aria-label="수량 줄이기" className="flex h-9 w-9 items-center justify-center disabled:opacity-30" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <MinusIcon size={16} />
            </button>
            <span className="w-8 text-center text-sm font-bold" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="수량 늘리기"
              className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
              disabled={quantity >= Math.max(1, variant.stock)}
              onClick={() => setQuantity((q) => Math.min(Math.max(1, variant.stock), q + 1))}
            >
              <PlusIcon size={16} />
            </button>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">총 상품금액</span>
            <span className="text-[1.65rem] font-extrabold tracking-tight">{formatKRW(goods)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{shipping === 0 ? "무료배송" : `배송비 ${formatKRW(shipping)} 별도 · ${formatKRW(left)} 더 담으면 무료`}</span>
            <span>적립 예정 {formatPoint(earn)}</span>
          </div>
        </div>

        {message ? (
          <p role="status" className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm text-white">
            <span>{message.text}</span>
            {message.cart ? (
              <Link href="/cart" className="font-bold text-[#ffb4ac] underline-offset-2 hover:underline">
                장바구니 보기 →
              </Link>
            ) : null}
          </p>
        ) : null}

        <div className="hidden gap-2 md:flex">
          <button type="button" aria-label={heart ? "찜 해제" : "찜하기"} aria-pressed={heart} className="btn btn-ghost !px-4" onClick={wish} disabled={pending}>
            <HeartIcon size={22} className={heart ? "fill-gochujang text-gochujang" : ""} />
          </button>
          <button type="button" className="btn btn-ghost flex-1 !py-4 text-base" disabled={soldOut || pending} onClick={() => add(false)}>
            <CartIcon size={20} /> 장바구니
          </button>
          <button type="button" className="btn btn-primary flex-[1.3] !py-4 text-base" disabled={soldOut || pending} onClick={() => add(true)}>
            {soldOut ? "일시 품절" : "바로 구매"}
          </button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:hidden">
        <div className="mb-2 flex items-baseline justify-between px-1 text-xs text-muted">
          <span className="truncate">
            {variant.optionName} · {quantity}개
          </span>
          <span className="text-base font-extrabold text-ink">{formatKRW(goods)}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label={heart ? "찜 해제" : "찜하기"} aria-pressed={heart} className="btn btn-ghost !px-3" onClick={wish} disabled={pending}>
            <HeartIcon size={22} className={heart ? "fill-gochujang text-gochujang" : ""} />
          </button>
          <button type="button" className="btn btn-ghost flex-1" disabled={soldOut || pending} onClick={() => add(false)}>
            장바구니
          </button>
          <button type="button" className="btn btn-primary flex-[1.4]" disabled={soldOut || pending} onClick={() => add(true)}>
            {soldOut ? "일시 품절" : "바로 구매"}
          </button>
        </div>
      </div>
    </>
  );
}
