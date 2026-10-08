import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import type { PricingItem } from "@/lib/pricing";
import { getCart, listAddresses, listUserCoupons, loadPolicy, pointBalanceOf, variantsForCheckout } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "주문서" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buy?: string; qty?: string; variant?: string | string[] }>;
}) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  if (!supabase || !user) redirect("/login?next=/checkout");
  if (profile?.status !== "active") return <p>주문할 수 없는 회원 상태입니다.</p>;

  const items: PricingItem[] = [];
  if (sp.buy) {
    const rows = await variantsForCheckout(supabase, [sp.buy]);
    const row = rows[0];
    const productValue = row?.products;
    const product = Array.isArray(productValue) ? productValue[0] : productValue;
    if (row && product && typeof product === "object") {
      const record = product as Record<string, unknown>;
      items.push({
        variantId: String(row.id),
        productId: String(record.id),
        categoryId: record.category_id ? String(record.category_id) : null,
        name: String(record.name ?? ""),
        optionName: String(row.option_name ?? "기본"),
        sku: String(row.sku ?? ""),
        listPrice: Number(row.list_price),
        salePrice: Number(row.sale_price),
        quantity: Math.max(1, Number(sp.qty) || 1),
        stock: Number(row.stock),
        productStatus: String(record.status ?? "stopped") as PricingItem["productStatus"],
        variantActive: row.is_active !== false,
        pointRateBps: Number(record.point_rate_bps ?? 100),
      });
    }
  } else {
    const selected = new Set(Array.isArray(sp.variant) ? sp.variant : sp.variant ? [sp.variant] : []);
    const cart = await getCart(supabase, user.id);
    for (const line of cart.lines) {
      if (selected.size > 0 && !selected.has(line.variantId)) continue;
      items.push({
        variantId: line.variantId,
        productId: line.productId,
        categoryId: line.categoryId,
        name: line.name,
        optionName: line.optionName,
        sku: line.sku,
        listPrice: line.listPrice,
        salePrice: line.salePrice,
        quantity: line.quantity,
        stock: line.stock,
        productStatus: line.status as PricingItem["productStatus"],
        variantActive: line.active,
        pointRateBps: line.pointRateBps,
      });
    }
  }

  const [policy, addresses, coupons, points] = await Promise.all([
    loadPolicy(supabase),
    listAddresses(supabase, user.id),
    listUserCoupons(supabase, user.id),
    pointBalanceOf(supabase, user.id),
  ]);

  return (
    <div>
      <h1 className="serif mb-6 text-4xl">주문서</h1>
      {items.length === 0 ? (
        <p>주문할 상품이 없습니다.</p>
      ) : (
        <>
          <ul className="mb-6 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.variantId}>
                {item.name} · {item.optionName} · {item.quantity}개
              </li>
            ))}
          </ul>
          <CheckoutForm
            items={items}
            coupons={coupons.coupons.flatMap((row) => (row.coupon && row.coupon.status === "available" ? [row.coupon] : []))}
            balance={points.balance}
            policy={policy}
            addresses={addresses.addresses}
          />
        </>
      )}
    </div>
  );
}
