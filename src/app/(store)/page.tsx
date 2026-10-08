import Link from "next/link";
import { preload } from "react-dom";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductGrid, Section } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { HERO_SIZES, HERO_SLIDES } from "@/lib/hero-carousel";
import { homeContent } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const { supabase } = await getSession();
  const home = supabase ? await homeContent(supabase) : null;
  const banners = home?.banners ?? [];
  const lead = HERO_SLIDES[0];
  preload(lead.avif, {
    as: "image",
    type: "image/avif",
    fetchPriority: "high",
    imageSrcSet: `${lead.avifSmall} 960w, ${lead.avif} 1672w`,
    imageSizes: HERO_SIZES,
  });
  return (
    <div>
      <section className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.72fr)]">
        <HeroCarousel />
        <div className="grid gap-3 lg:h-full lg:auto-rows-fr">
          {(banners.length > 0 ? banners : [{ id: "local", title: "새로 담근 것들", subtitle: "참깨 간장소스와 창난젓", link_url: "/new" }]).map(
            (banner, index) => (
              <Link key={String(banner.id)} href={String(banner.link_url || "/")} className="panel block h-full p-5" style={{ background: index === 1 ? "#f7e7df" : undefined }}>
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
