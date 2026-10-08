import { Flash } from "@/components/ui";
import { listInventory, listPurchaseOrders } from "@/lib/admin-data";
import { formatDate, formatKRW } from "@/lib/format";
import { PO_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { createPurchaseOrder, receivePurchaseOrder } from "@/server/admin";

export const metadata = { title: "발주" };

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const [orders, inventory] = await Promise.all([listPurchaseOrders(session.supabase), listInventory(session.supabase)]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif text-4xl">발주</h1>
        <div className="mt-4">
          <Flash notice={sp.notice} error={sp.error || orders.error || undefined} />
        </div>
      </div>
      <form action={createPurchaseOrder} className="panel grid gap-2 p-4 md:grid-cols-3">
        <input className="field" name="poNo" required placeholder="발주번호 PO-001" aria-label="발주번호" />
        <input className="field" name="supplier" placeholder="공급처" aria-label="공급처" />
        <input className="field" name="memo" placeholder="메모" aria-label="메모" />
        <select className="field" name="variantId" required aria-label="옵션">
          <option value="">옵션 선택</option>
          {inventory.variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.productName} · {variant.optionName} ({variant.sku})
            </option>
          ))}
        </select>
        <input className="field" name="quantity" type="number" min={1} required placeholder="수량" aria-label="발주 수량" />
        <input className="field" name="unitCost" type="number" min={0} placeholder="단가" aria-label="단가" />
        <button className="btn btn-primary md:col-span-3" type="submit">
          발주 등록
        </button>
      </form>
      <ul className="space-y-3">
        {orders.orders.map((order) => (
          <li key={order.id} className="panel p-4">
            <p className="font-medium">
              {order.poNo} · {labelOf(PO_STATUS_LABEL, order.status)}
            </p>
            <p className="text-sm text-muted">
              {order.supplier || "공급처 없음"} · {formatDate(order.createdAt)} {order.memo}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {item.label} · {item.sku}
                    <span className="block text-muted">
                      입고 {item.received}/{item.quantity}
                      {item.unitCost ? ` · ${formatKRW(item.unitCost)}` : ""}
                    </span>
                  </span>
                  {item.received < item.quantity ? (
                    <form action={receivePurchaseOrder} className="flex gap-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input className="field w-24" name="quantity" type="number" min={1} max={item.quantity - item.received} defaultValue={item.quantity - item.received} aria-label="입고 수량" />
                      <button className="btn btn-ghost" type="submit">
                        입고
                      </button>
                    </form>
                  ) : (
                    <span className="text-muted">입고 완료</span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
