import Link from "next/link";
import { ProductGrid, Section } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { homeContent } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const { supabase } = await getSession();
  const home = supabase ? await homeContent(supabase) : null;
  const banners = home?.banners ?? [];
  return (
    <div>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-paper md:px-10 md:py-14">
          <p className="text-sm text-white/70">Modern Korean Pantry</p>
          <h1 className="serif mt-3 max-w-xl text-4xl leading-tight md:text-6xl">찬장에서 꺼내는 오늘의 맛</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/80 md:text-base">
            소스, 장류, 장아찌, 반찬, 젓갈. 잡사바는 밥상에 바로 올리는 맛을 작은 병과 컵에 담습니다.
          </p>
          <div className="mt-6 flex gap-2">
            <Link href="/category/jang" className="btn bg-gochujang text-white">
              장류 보기
            </Link>
            <Link href="/events" className="btn bg-white/10 text-white">
              기획전
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {(banners.length > 0 ? banners : [{ id: "local", title: "새로 담근 것들", subtitle: "참깨 간장소스와 창난젓", link_url: "/new" }]).map(
            (banner, index) => (
              <Link key={String(banner.id)} href={String(banner.link_url || "/")} className="panel block p-5" style={{ background: index === 1 ? "#f7e7df" : undefined }}>
                <p className="text-xs text-gochujang">0{index + 1}</p>
                <p className="serif mt-2 text-2xl">{String(banner.title)}</p>
                <p className="mt-1 text-sm text-muted">{String(banner.subtitle || "")}</p>
              </Link>
            ),
          )}
        </div>
      </section>
      {home?.error ? <p className="mt-4 text-sm text-gochujang">{home.error}</p> : null}
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {(home?.categories ?? []).map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`} className="panel p-4">
            <p className="font-semibold">{category.name}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{category.description}</p>
          </Link>
        ))}
      </section>
      <Section title="베스트" href="/best">
        <ProductGrid products={home?.best ?? []} />
      </Section>
      <Section title="신상품" href="/new">
        <ProductGrid products={home?.fresh ?? []} />
      </Section>
      <Section title="1+1 기획" href="/events/one-plus-one">
        <p className="mb-3 text-sm text-muted">1+1 표시는 모음용 뱃지입니다. 결제 금액은 판매가 그대로입니다.</p>
        <ProductGrid products={home?.onePlus ?? []} />
      </Section>
      <Section title="최근 리뷰" href="/best">
        <ul className="grid gap-3 md:grid-cols-2">
          {(home?.reviews ?? []).map((review) => (
            <li key={review.id} className="panel p-4">
              <p className="text-sm text-gochujang">{"★".repeat(review.rating)}</p>
              <p className="mt-2 text-sm leading-6">{review.content}</p>
              <p className="mt-2 text-xs text-muted">
                {review.displayName}
                {review.isSeed ? " · 샘플" : ""} · {review.productName} · {formatDate(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
