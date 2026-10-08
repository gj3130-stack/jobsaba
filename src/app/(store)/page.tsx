import Link from "next/link";
import { preload } from "react-dom";
import { LogoIcon, Wordmark } from "@/components/brand";
import { HeroCarousel } from "@/components/hero-carousel";
import { BowlIcon, ChevronRight, ClockIcon, LeafIcon, ShieldIcon, SnowIcon, TruckIcon } from "@/components/icons";
import { ProductCard, ProductGrid, Section, SectionHeader, Stars } from "@/components/ui";
import { catalogCategoryBySlug } from "@/lib/catalog-data";
import { formatDate } from "@/lib/format";
import { HERO_SIZES, HERO_SLIDES } from "@/lib/hero-carousel";
import { getSession } from "@/lib/session";
import { storeHome } from "@/lib/store-data";

const CATEGORY_ART: Record<string, string> = {
  sauce: "/images/products/jobsaba-chamgireum.webp",
  jang: "/images/products/bori-gochujang.webp",
  jangajji: "/images/products/tongmaneul-jangajji.webp",
  banchan: "/images/products/janmyeolchi-bokkeum.webp",
  jeotgal: "/images/products/myeolchi-aekjeot.webp",
  gift: "/images/products/jangdok-samjong-set.webp",
};

const PROMISES = [
  { Icon: TruckIcon, title: "3만원 이상 무료배송", body: "기본 배송비 3,500원" },
  { Icon: ShieldIcon, title: "오후 2시 전 당일출고", body: "평일 결제 기준" },
  { Icon: SnowIcon, title: "냉장은 아이스 포장", body: "금·토·일 출고 없이" },
  { Icon: LeafIcon, title: "원산지·함량 공개", body: "상품마다 고시 표기" },
];

const STORY_POINTS = [
  {
    no: "01",
    title: "원료는 국산 먼저",
    body: "참깨·보리·고춧가루까지 원산지를 상품마다 그대로 적어요.",
    Icon: LeafIcon,
  },
  {
    no: "02",
    title: "시간이 만드는 맛",
    body: "고추장은 항아리에서, 액젓은 천천히. 서두르지 않고 숙성합니다.",
    Icon: ClockIcon,
  },
  {
    no: "03",
    title: "작게, 자주, 신선하게",
    body: "한 번에 많이 만들지 않고 주문에 맞춰 소량씩 담아 보내요.",
    Icon: BowlIcon,
  },
] as const;

export default async function HomePage() {
  const { supabase } = await getSession();
  const home = await storeHome(supabase);
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
      <HeroCarousel />

      <ul className="mt-4 grid grid-cols-2 gap-2 md:mt-6 md:grid-cols-4 md:gap-4">
        {PROMISES.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line md:px-5 md:py-4">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gochujang-soft text-gochujang md:flex">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold leading-tight md:text-sm">{title}</span>
              <span className="mt-0.5 block text-[11px] text-muted md:text-xs">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      {home.error ? <p className="mt-4 text-sm text-gochujang">{home.error}</p> : null}

      <section className="mt-14 md:mt-20">
        <SectionHeader eyebrow="Category" title="오늘은 뭘 잡숴 볼까요" body={`잡사바 찬장에 ${home.total}가지 맛이 담겨 있어요.`} href="/category" />
        <ul className="grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-4">
          {home.categories.map((category) => {
            const meta = catalogCategoryBySlug(category.slug);
            return (
              <li key={category.id}>
                <Link href={`/category/${category.slug}`} className="group block overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="block aspect-square overflow-hidden bg-cream-deep">
                    <img src={CATEGORY_ART[category.slug] ?? "/brand/jobsaba-icon.svg"} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </span>
                  <span className="block px-3 pb-3 pt-2.5 md:px-4 md:pb-4">
                    <span className="flex items-baseline justify-between gap-1">
                      <span className="text-[15px] font-bold md:text-base">{category.name}</span>
                      <span className="text-xs font-semibold text-gochujang">{home.counts[category.slug] ?? 0}</span>
                    </span>
                    <span className="mt-0.5 hidden truncate text-xs text-muted md:block">{meta?.tagline ?? category.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-16 md:mt-24">
        <SectionHeader eyebrow="Best" title="많이 잡숴 본 베스트" body="재구매가 가장 많은 순서예요." href="/best" />
        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
          {home.best.slice(0, 8).map((product, index) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} rank={index + 1} priority={index < 4} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="brand-story-title" className="brand-story mt-16 rounded-[1.75rem] md:mt-24 md:rounded-[2rem]">
        <div className="grid items-center gap-9 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-16 lg:px-14 lg:py-16">
          <div className="story-copy min-w-0">
            <div className="flex items-center gap-3.5">
              <span className="rounded-[1.15rem] bg-paper p-1.5 shadow-[0_12px_28px_rgb(80_12_8/0.28)] ring-1 ring-white/80">
                <LogoIcon size={52} />
              </span>
              <Wordmark height={24} className="text-white" />
            </div>
            <p className="mt-8 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-cream">Story</p>
            <h2 id="brand-story-title" className="story-title serif mt-3 font-bold keep-all">
              <span className="block">잡사바는</span>
              <span className="mt-[0.06em] block whitespace-nowrap">“한번 잡숨봐”예요.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-white/90 keep-all">
              어른들이 밥상 앞에서 건네던 그 말, “이거 한번 잡숴 봐.” 잡사바는 그 마음으로 매일 꺼내 먹는 기름과 장, 젓갈을 만듭니다. 덜 달고, 덜 짜고, 원재료는 숨기지
              않고요.
            </p>
            <Link
              href="/category/sauce"
              className="btn mt-8 w-full bg-white text-gochujang shadow-[0_10px_24px_rgb(80_12_8/0.18)] hover:bg-cream sm:w-fit"
            >
              대표 상품 보러 가기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="grid gap-3">
            {STORY_POINTS.map(({ no, title, body, Icon }) => (
              <li key={no} className="rounded-2xl bg-paper px-5 py-4 text-ink shadow-[0_16px_36px_rgb(90_14_10/0.2)] ring-1 ring-white/70 sm:py-5">
                <span className="flex items-start justify-between gap-3">
                  <span className="serif text-[1.7rem] font-bold leading-none tracking-tight text-gochujang">{no}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gochujang-soft text-gochujang">
                    <Icon size={18} />
                  </span>
                </span>
                <span className="mt-3 block text-[15px] font-bold leading-snug keep-all sm:text-base">{title}</span>
                <span className="mt-1.5 block text-sm leading-6 text-muted keep-all">{body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section eyebrow="New" title="새로 담갔어요" body="이번 계절에 새로 선보이는 맛." href="/new">
        <ProductGrid products={home.fresh.slice(0, 5)} />
      </Section>

      <section className="mt-16 md:mt-24">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[1.75rem] bg-[#F7E3B5] px-6 py-7 md:mb-8 md:flex-row md:items-center md:px-10 md:py-8">
          <div>
            <p className="eyebrow !text-ink/70">1+1 Event</p>
            <h2 className="serif mt-1.5 text-[1.6rem] font-bold leading-tight md:text-[2.1rem]">하나 사면 하나 더, 1+1 찬장</h2>
            <p className="mt-2 text-sm text-ink/70">두 개 묶음 1+1 옵션을 특가로 준비했어요. 재고가 떨어지면 일찍 끝날 수 있어요.</p>
          </div>
          <Link href="/events/one-plus-one" className="btn btn-dark w-fit shrink-0">
            기획전 전체보기 <ChevronRight size={16} />
          </Link>
        </div>
        <ProductGrid products={home.onePlus.slice(0, 5)} />
      </section>

      <Section eyebrow="Gift" title="마음까지 담은 선물세트" body="명절, 집들이, 감사 인사에. 보자기 포장으로 보내 드려요." href="/category/gift">
        <ProductGrid products={home.gifts.slice(0, 4)} columns="four" />
      </Section>

      <section className="mt-16 md:mt-24">
        <SectionHeader eyebrow="Review" title="잡숴 본 분들의 이야기" href="/best" linkLabel="베스트 보기" />
        <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {home.reviews.slice(0, 6).map((review) => (
            <li key={review.id} className="w-[82%] shrink-0 snap-start md:w-auto">
              <Link href={review.slug ? `/products/${review.slug}` : "/best"} className="flex h-full gap-4 rounded-2xl bg-paper p-5 ring-1 ring-line transition hover:shadow-md">
                {review.image ? <img src={review.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-cream-deep object-cover" /> : null}
                <span className="min-w-0">
                  <Stars rating={review.rating} />
                  <span className="mt-2 line-clamp-3 block text-sm leading-6">{review.content}</span>
                  <span className="mt-2 block truncate text-xs text-muted">
                    {review.displayName} · {review.productName} · {formatDate(review.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
