"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKRW } from "@/lib/format";
import { readGuestCart, writeGuestCart, type GuestCartItem } from "@/lib/guest-cart";
import type { CartLine } from "@/lib/models";
import { changeCartVariant, removeCartItem, updateCartQuantity } from "@/server/shop";

export function MemberCart({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(lines.map((line) => line.variantId));
  const chosen = lines.filter((line) => selected.includes(line.variantId));
  const goods = chosen.reduce((sum, line) => sum + line.salePrice * line.quantity, 0);

  function refresh(task: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      await task();
      router.refresh();
    });
  }

  if (lines.length === 0) {
    return (
      <div className="panel px-6 py-16 text-center">
        <h1 className="serif text-3xl">장바구니가 비어 있습니다.</h1>
        <Link href="/category/all" className="btn btn-primary mt-5">
          상품 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line.id} className="panel flex gap-3 p-3">
            <input
              type="checkbox"
              className="mt-2"
              checked={selected.includes(line.variantId)}
              aria-label={`${line.name} 선택`}
              onChange={(event) =>
                setSelected((prev) => (event.target.checked ? [...prev, line.variantId] : prev.filter((id) => id !== line.variantId)))
              }
            />
            <img src={line.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link href={`/products/${line.slug}`} className="font-medium">
                {line.name}
              </Link>
              <label className="mt-2 block text-xs text-muted">
                옵션
                <select
                  className="field mt-1"
                  value={line.variantId}
                  onChange={(event) => refresh(() => changeCartVariant(line.id, event.target.value))}
                >
                  {line.options.map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.active || option.stock <= 0}>
                      {option.optionName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="field w-20"
                  type="number"
                  min={1}
                  max={line.stock}
                  defaultValue={line.quantity}
                  aria-label="수량"
                  onBlur={(event) => refresh(() => updateCartQuantity(line.id, Number(event.target.value)))}
                />
                <button type="button" className="text-sm text-muted" onClick={() => refresh(() => removeCartItem(line.id))}>
                  삭제
                </button>
              </div>
            </div>
            <p className="font-semibold">{formatKRW(line.salePrice * line.quantity)}</p>
          </li>
        ))}
      </ul>
      <aside className="panel h-fit p-5">
        <p className="text-sm text-muted">선택 상품</p>
        <p className="serif mt-2 text-3xl">{formatKRW(goods)}</p>
        <p className="mt-2 text-xs text-muted">쿠폰, 포인트, 배송비는 주문서에서 다시 계산합니다.</p>
        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          disabled={pending || chosen.length === 0}
          onClick={() => router.push(`/checkout?${chosen.map((line) => `variant=${line.variantId}`).join("&")}`)}
        >
          선택 주문
        </button>
      </aside>
    </div>
  );
}

export function GuestCart() {
  const router = useRouter();
  const [lines, setLines] = useState<GuestCartItem[]>([]);
  useEffect(() => setLines(readGuestCart()), []);
  const goods = lines.reduce((sum, line) => sum + line.salePrice * line.quantity, 0);

  function update(next: GuestCartItem[]) {
    setLines(next);
    writeGuestCart(next);
  }

  if (lines.length === 0) {
    return (
      <div className="panel px-6 py-16 text-center">
        <h1 className="serif text-3xl">장바구니가 비어 있습니다.</h1>
        <Link href="/" className="btn btn-primary mt-5">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line.variantId} className="panel flex gap-3 p-3">
            <img src={line.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
            <div className="flex-1">
              <Link href={`/products/${line.slug}`} className="font-medium">
                {line.name}
              </Link>
              <p className="text-sm text-muted">{line.optionName}</p>
              <input
                className="field mt-2 w-20"
                type="number"
                min={1}
                max={line.stock}
                value={line.quantity}
                aria-label="수량"
                onChange={(event) =>
                  update(lines.map((item) => (item.variantId === line.variantId ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item)))
                }
              />
              <button type="button" className="ml-3 text-sm text-muted" onClick={() => update(lines.filter((item) => item.variantId !== line.variantId))}>
                삭제
              </button>
            </div>
            <p className="font-semibold">{formatKRW(line.salePrice * line.quantity)}</p>
          </li>
        ))}
      </ul>
      <aside className="panel h-fit p-5">
        <p className="serif text-3xl">{formatKRW(goods)}</p>
        <p className="mt-2 text-sm text-muted">비회원 결제는 받지 않습니다. 로그인하면 이 장바구니가 회원 장바구니로 합쳐집니다.</p>
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => router.push("/login?next=/cart")}>
          로그인하고 주문
        </button>
      </aside>
    </div>
  );
}
