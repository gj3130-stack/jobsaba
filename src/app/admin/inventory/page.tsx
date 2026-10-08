import { Flash } from "@/components/ui";
import { listInventory } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/session";
import { adjustStock } from "@/server/admin";

export const metadata = { title: "재고" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { variants, error } = await listInventory(session.supabase);
  return (
    <div>
      <h1 className="serif text-4xl">재고</h1>
      <p className="mt-2 text-sm text-muted">수량을 더하거나 빼면 재고 이동 기록이 남습니다. 음수로 내려가지 않습니다.</p>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <ul className="mt-4 space-y-2">
        {variants.map((variant) => (
          <li key={variant.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              {variant.productName} · {variant.optionName}
              <span className="block text-muted">
                {variant.sku} · 현재 {variant.stock} · 안전 {variant.safetyStock}
              </span>
            </span>
            <form action={adjustStock} className="flex gap-2">
              <input type="hidden" name="variantId" value={variant.id} />
              <input className="field w-24" name="delta" type="number" placeholder="+10" aria-label={`${variant.sku} 변경 수량`} required />
              <input className="field w-40" name="reason" placeholder="사유" aria-label="사유" />
              <button className="btn btn-ghost" type="submit">
                반영
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
