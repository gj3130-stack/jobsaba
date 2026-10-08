import { Flash } from "@/components/ui";
import { formatKRW } from "@/lib/format";
import { listClaimableCoupons, listUserCoupons } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { claimCoupon } from "@/server/shop";

export const metadata = { title: "쿠폰" };

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const mine = supabase && user ? await listUserCoupons(supabase, user.id) : { coupons: [] };
  const claimable = supabase ? await listClaimableCoupons(supabase) : { coupons: [] };
  const owned = new Set(mine.coupons.map((row) => row.coupon?.code));
  return (
    <div>
      <h1 className="serif text-4xl">쿠폰</h1>
      <p className="mt-2 text-sm text-muted">한 주문에 쿠폰은 한 장만 적용됩니다.</p>
      <div className="mt-4"><Flash notice={sp.notice} error={sp.error} /></div>
      <ul className="mt-4 space-y-3">
        {mine.coupons.map((row) => (
          <li key={row.coupon?.userCouponId} className="panel p-4 text-sm">
            <p className="font-medium">{row.coupon?.name}</p>
            <p className="mt-1 text-muted">{row.coupon?.code} · {row.coupon?.status} · 최소 {formatKRW(row.coupon?.minOrderAmount || 0)}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-semibold">받을 수 있는 쿠폰</h2>
      <ul className="mt-3 space-y-3">
        {claimable.coupons.map((coupon) => (
          <li key={String(coupon.id)} className="panel flex items-center justify-between p-4 text-sm">
            <span>
              {String(coupon.name)} · {String(coupon.code)}
            </span>
            {owned.has(String(coupon.code)) ? (
              <span className="text-muted">보유</span>
            ) : (
              <form action={claimCoupon}>
                <input type="hidden" name="code" value={String(coupon.code)} />
                <button className="btn btn-primary" type="submit">받기</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
