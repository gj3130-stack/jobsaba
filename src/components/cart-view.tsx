"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, MinusIcon, PlusIcon, TruckIcon } from "@/components/icons";
import { discountRate, formatKRW } from "@/lib/format";
import { readGuestCart, writeGuestCart, type GuestCartItem } from "@/lib/guest-cart";
import type { CartLine } from "@/lib/models";
import { changeCartVariant, removeCartItem, updateCartQuantity } from "@/server/shop";

type CartPolicy = { baseShippingFee: number; freeShippingThreshold: number };

function EmptyCart() {
  return (
    <div className="rounded-2xl bg-paper px-6 py-16 text-center ring-1 ring-line">
      <p className="serif text-2xl font-bold">장바구니가 비어 있어요</p>
      <p className="mt-2 text-sm text-muted">참기름 한 병부터 한번 잡숴 보세요.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/best" className="btn btn-primary">
          베스트 보기
        </Link>
        <Link href="/category" className="btn btn-ghost">
          카테고리
        </Link>
      </div>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (next: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-white ring-1 ring-line">
      <button type="button" aria-label="수량 줄이기" className="flex h-8 w-8 items-center justify-center disabled:opacity-30" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <MinusIcon size={14} />
      </button>
      <span className="w-7 text-center text-sm font-bold">{value}</span>
      <button type="button" aria-label="수량 늘리기" className="flex h-8 w-8 items-center justify-center disabled:opacity-30" disabled={value >= Math.max(1, max)} onClick={() => onChange(value + 1)}>
        <PlusIcon size={14} />
      </button>
    </div>
  );
}

function Summary({
  goods,
  list,
  count,
  policy,
  children,
}: {
  goods: number;
  list: number;
  count: number;
  policy: CartPolicy;
  children: React.ReactNode;
}) {
  const shipping = goods === 0 || goods >= policy.freeShippingThreshold ? 0 : policy.baseShippingFee;
  const left = Math.max(0, policy.freeShippingThreshold - goods);
  const progress = Math.min(100, (goods / policy.freeShippingThreshold) * 100);
  return (
    <aside className="h-fit rounded-2xl bg-paper p-5 ring-1 ring-line lg:sticky lg:top-44">
      <div className="rounded-xl bg-cream p-3.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <TruckIcon size={18} className="text-gochujang" />
          {left > 0 ? (
            <span>
              <b className="text-gochujang">{formatKRW(left)}</b> 더 담으면 무료배송
            </span>
          ) : (
            <span>무료배송 조건을 채웠어요!</span>
          )}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-gochujang transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">상품 금액 ({count}개)</dt>
          <dd>{formatKRW(list)}</dd>
        </div>
        {list > goods ? (
          <div className="flex justify-between">
            <dt className="text-muted">상품 할인</dt>
            <dd className="font-semibold text-gochujang">−{formatKRW(list - goods)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted">배송비</dt>
          <dd>{shipping === 0 ? "무료" : formatKRW(shipping)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-bold">결제 예정 금액</span>
        <span className="text-2xl font-extrabold">{formatKRW(goods + shipping)}</span>
      </div>
      <p className="mt-1 text-right text-xs text-muted">쿠폰·포인트·제주/도서산간 배송비는 주문서에서 계산돼요.</p>
      {children}
    </aside>
  );
}

export function MemberCart({ lines, policy }: { lines: CartLine[]; policy: CartPolicy }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(lines.map((line) => line.variantId));
  const chosen = lines.filter((line) => selected.includes(line.variantId));
  const goods = chosen.reduce((sum, line) => sum + line.salePrice * line.quantity, 0);
  const list = chosen.reduce((sum, line) => sum + Math.max(line.listPrice, line.salePrice) * line.quantity, 0);

  function refresh(task: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      await task();
      router.refresh();
    });
  }

  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line rounded-2xl bg-paper px-4 ring-1 ring-line md:px-5">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-3 py-4 md:gap-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#D1271E]"
              checked={selected.includes(line.variantId)}
              aria-label={`${line.name} 선택`}
              onChange={(event) => setSelected((prev) => (event.target.checked ? [...prev, line.variantId] : prev.filter((id) => id !== line.variantId)))}
            />
            <img src={line.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-cream-deep object-cover md:h-24 md:w-24" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/products/${line.slug}`} className="line-clamp-2 font-semibold leading-snug">
                  {line.name}
                </Link>
                <button type="button" aria-label="삭제" className="shrink-0 text-muted hover:text-ink" onClick={() => refresh(() => removeCartItem(line.id))}>
                  <CloseIcon size={18} />
                </button>
              </div>
              <select className="field mt-2 !py-1.5 text-sm" value={line.variantId} aria-label="옵션" onChange={(event) => refresh(() => changeCartVariant(line.id, event.target.value))}>
                {line.options.map((option) => (
                  <option key={option.id} value={option.id} disabled={!option.active || option.stock <= 0}>
                    {option.optionName}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between">
                <Stepper value={line.quantity} max={line.stock} onChange={(next) => refresh(() => updateCartQuantity(line.id, next))} />
                <p className="font-bold">{formatKRW(line.salePrice * line.quantity)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Summary goods={goods} list={list} count={chosen.reduce((sum, line) => sum + line.quantity, 0)} policy={policy}>
        <button
          type="button"
          className="btn btn-primary mt-4 w-full !py-4 text-base"
          disabled={pending || chosen.length === 0}
          onClick={() => router.push(`/checkout?${chosen.map((line) => `variant=${line.variantId}`).join("&")}`)}
        >
          {chosen.length}개 상품 주문하기
        </button>
      </Summary>
    </div>
  );
}

export function GuestCart({ policy, checkoutReady }: { policy: CartPolicy; checkoutReady: boolean }) {
  const router = useRouter();
  const [lines, setLines] = useState<GuestCartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setLines(readGuestCart());
    setReady(true);
  }, []);
  const goods = lines.reduce((sum, line) => sum + line.salePrice * line.quantity, 0);
  const list = lines.reduce((sum, line) => sum + Math.max(line.listPrice, line.salePrice) * line.quantity, 0);

  function update(next: GuestCartItem[]) {
    setLines(next);
    writeGuestCart(next);
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-paper ring-1 ring-line" />;
  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line rounded-2xl bg-paper px-4 ring-1 ring-line md:px-5">
        {lines.map((line) => {
          const rate = discountRate(line.listPrice, line.salePrice);
          return (
            <li key={line.variantId} className="flex gap-3 py-4 md:gap-4">
              <Link href={`/products/${line.slug}`} className="shrink-0">
                <img src={line.image} alt="" className="h-20 w-20 rounded-xl bg-cream-deep object-cover md:h-24 md:w-24" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${line.slug}`} className="line-clamp-2 font-semibold leading-snug">
                    {line.name}
                  </Link>
                  <button type="button" aria-label={`${line.name} 삭제`} className="shrink-0 text-muted hover:text-ink" onClick={() => update(lines.filter((item) => item.variantId !== line.variantId))}>
                    <CloseIcon size={18} />
                  </button>
                </div>
                <p className="mt-0.5 text-sm text-muted">{line.optionName}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Stepper
                    value={line.quantity}
                    max={line.stock}
                    onChange={(next) => update(lines.map((item) => (item.variantId === line.variantId ? { ...item, quantity: Math.max(1, Math.min(item.stock || next, next)) } : item)))}
                  />
                  <p className="text-right">
                    {rate > 0 ? <span className="mr-1 text-xs font-bold text-gochujang">{rate}%</span> : null}
                    <span className="font-bold">{formatKRW(line.salePrice * line.quantity)}</span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Summary goods={goods} list={list} count={lines.reduce((sum, line) => sum + line.quantity, 0)} policy={policy}>
        <button type="button" className="btn btn-primary mt-4 w-full !py-4 text-base" onClick={() => router.push("/login?next=/cart")}>
          로그인하고 주문하기
        </button>
        <p className="mt-3 rounded-xl bg-cream px-3.5 py-3 text-xs leading-5 text-muted">
          {checkoutReady
            ? "비회원 주문은 받지 않아요. 로그인하면 지금 담은 상품이 회원 장바구니로 그대로 옮겨져요."
            : "온라인 결제는 오픈 준비 중이에요. 담은 상품은 이 브라우저에 그대로 저장되니, 결제가 열리면 바로 주문하실 수 있어요."}
        </p>
      </Summary>
    </div>
  );
}
