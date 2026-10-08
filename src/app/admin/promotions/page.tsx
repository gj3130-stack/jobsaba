import { Flash } from "@/components/ui";
import { listPromotions } from "@/lib/admin-data";
import { formatKRW } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { issueCoupon, saveBanner, saveCoupon } from "@/server/admin";

export const metadata = { title: "프로모션" };

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const data = await listPromotions(session.supabase);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif text-4xl">프로모션</h1>
        <p className="mt-2 text-sm text-muted">주문에는 쿠폰 한 장만 적용됩니다.</p>
        <div className="mt-4">
          <Flash notice={sp.notice} error={sp.error || data.error || undefined} />
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {data.coupons.map((coupon) => (
          <li key={coupon.id} className="panel p-4">
            <span className="font-medium">{coupon.name}</span> · {coupon.code} ·{" "}
            {coupon.discountType === "percent" ? `${coupon.discountValue}%` : formatKRW(coupon.discountValue)} · 최소 {formatKRW(coupon.minOrder)}
            {!coupon.active ? " · 중지" : ""}
          </li>
        ))}
      </ul>
      <form action={saveCoupon} className="panel grid gap-2 p-4 md:grid-cols-2">
        <input className="field" name="code" required placeholder="코드" aria-label="쿠폰 코드" />
        <input className="field" name="name" required placeholder="이름" aria-label="쿠폰 이름" />
        <select className="field" name="discountType" aria-label="할인 방식">
          <option value="fixed">정액</option>
          <option value="percent">정률</option>
        </select>
        <input className="field" name="discountValue" type="number" min={0} required placeholder="할인값" aria-label="할인값" />
        <input className="field" name="minOrder" type="number" min={0} placeholder="최소 주문" aria-label="최소 주문" />
        <input className="field" name="maxDiscount" type="number" min={0} placeholder="최대 할인" aria-label="최대 할인" />
        <select className="field" name="categoryId" aria-label="대상 분류">
          <option value="">전체 분류</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input className="field" name="startsAt" type="datetime-local" aria-label="시작" />
        <input className="field" name="endsAt" type="datetime-local" aria-label="종료" />
        <button className="btn btn-primary" type="submit">
          쿠폰 등록
        </button>
      </form>
      <form action={issueCoupon} className="panel flex flex-wrap gap-2 p-4">
        <input className="field max-w-xs" name="email" type="email" required placeholder="회원 이메일" aria-label="회원 이메일" />
        <input className="field max-w-xs" name="code" required placeholder="쿠폰 코드" aria-label="발급 코드" />
        <button className="btn btn-ghost" type="submit">
          발급
        </button>
      </form>
      <section>
        <h2 className="serif text-2xl">배너</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.banners.map((banner) => (
            <li key={banner.id} className="panel p-4">
              {banner.title} · {banner.subtitle} {banner.active ? "" : "· 중지"}
            </li>
          ))}
        </ul>
        <form action={saveBanner} className="panel mt-3 grid gap-2 p-4 md:grid-cols-2">
          <input className="field" name="title" required placeholder="제목" aria-label="배너 제목" />
          <input className="field" name="subtitle" placeholder="부제" aria-label="배너 부제" />
          <input className="field" name="linkUrl" placeholder="/events" aria-label="링크" />
          <input className="field" name="sortOrder" type="number" defaultValue={0} aria-label="정렬" />
          <button className="btn btn-primary" type="submit">
            배너 추가
          </button>
        </form>
      </section>
    </div>
  );
}
