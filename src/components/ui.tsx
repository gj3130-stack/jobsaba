import Link from "next/link";
import { ChevronRight, StarIcon } from "@/components/icons";
import { discountRate, formatKRW } from "@/lib/format";
import type { ProductCard } from "@/lib/models";

export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-gochujang-soft px-4 py-3 text-sm font-medium text-gochujang-dark ring-1 ring-gochujang/20">
        {error}
      </p>
    );
  }
  if (notice) return <p className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-line">{notice}</p>;
  return null;
}

const BADGE_TONE = {
  best: "bg-gochujang text-white",
  new: "bg-ink text-white",
  plus: "bg-[#F2B53A] text-ink",
  cold: "bg-[#E4EEF7] text-frost",
  frozen: "bg-frost text-white",
  muted: "bg-white/90 text-muted ring-1 ring-line",
} as const;

export function Badge({ children, tone = "new" }: { children: React.ReactNode; tone?: keyof typeof BADGE_TONE }) {
  return <span className={`inline-flex h-[22px] items-center rounded-md px-1.5 text-[11px] font-bold tracking-wide ${BADGE_TONE[tone]}`}>{children}</span>;
}

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex text-gochujang" aria-label={`별점 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} size={size} filled={rating >= value - 0.25} />
      ))}
    </span>
  );
}

export function Empty({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="panel px-6 py-14 text-center">
      <p className="serif text-2xl font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {href && action ? (
        <Link href={href} className="btn btn-primary mt-6">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ProductGrid({ products, columns = "default" }: { products: ProductCard[]; columns?: "default" | "four" }) {
  if (products.length === 0) {
    return <Empty title="해당하는 상품이 없어요" body="다른 카테고리나 검색어로 다시 찾아 보세요." href="/category" action="전체 상품 보기" />;
  }
  const cols = columns === "four" ? "lg:grid-cols-4" : "lg:grid-cols-4 xl:grid-cols-5";
  return (
    <ul className={`grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 ${cols}`}>
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductCard({ product, rank, priority = false }: { product: ProductCard; rank?: number; priority?: boolean }) {
  const rate = discountRate(product.listPrice, product.salePrice);
  const soldOut = product.stock <= 0 || product.status !== "on_sale";
  return (
    <article className="group flex h-full min-w-0 flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-cream-deep">
        <img
          src={product.image}
          alt={product.imageAlt}
          loading={priority ? "eager" : "lazy"}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${soldOut ? "opacity-60 grayscale" : ""}`}
        />
        {rank ? (
          <span className="serif absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-br-2xl bg-ink text-lg font-bold text-white">{rank}</span>
        ) : null}
        <span className={`absolute ${rank ? "left-12" : "left-2.5"} top-2.5 flex flex-wrap gap-1`}>
          {product.isBest && !rank ? <Badge tone="best">BEST</Badge> : null}
          {product.isNew ? <Badge tone="new">NEW</Badge> : null}
          {product.isOnePlusOne ? <Badge tone="plus">1+1</Badge> : null}
        </span>
        {product.storageType === "refrigerated" ? (
          <span className="absolute bottom-2.5 left-2.5">
            <Badge tone="cold">❄ 냉장</Badge>
          </span>
        ) : product.storageType === "frozen" ? (
          <span className="absolute bottom-2.5 left-2.5">
            <Badge tone="frozen">❄ 냉동</Badge>
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-ink/80 px-4 py-1.5 text-sm font-bold text-white">일시 품절</span>
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col pt-3">
        <p className="text-xs font-medium text-muted">
          {product.categoryName}
          {product.tag && product.tag !== product.categoryName ? ` · ${product.tag}` : ""}
        </p>
        <Link href={`/products/${product.slug}`} className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight hover:underline md:text-base">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-[13px] text-muted">{product.summary}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
          {rate > 0 ? <span className="text-[17px] font-extrabold text-gochujang">{rate}%</span> : null}
          <span className="text-[17px] font-extrabold">{formatKRW(product.salePrice)}</span>
          {rate > 0 ? <span className="text-xs text-muted line-through">{formatKRW(product.listPrice)}</span> : null}
        </div>
        {product.reviewCount ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <StarIcon size={12} className="text-gochujang" />
            <span className="font-semibold text-ink">{product.rating?.toFixed(1)}</span>
            <span>리뷰 {product.reviewCount}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function SectionHeader({ eyebrow, title, body, href, linkLabel = "전체보기" }: { eyebrow?: string; title: string; body?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="serif mt-1.5 text-[1.6rem] font-bold leading-tight md:text-[2.1rem]">{title}</h2>
        {body ? <p className="mt-2 text-sm text-muted md:text-[15px]">{body}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-muted hover:text-ink">
          {linkLabel}
          <ChevronRight size={16} />
        </Link>
      ) : null}
    </div>
  );
}

export function Section({ title, eyebrow, body, href, children }: { title: string; eyebrow?: string; body?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-16 md:mt-24">
      <SectionHeader eyebrow={eyebrow} title={title} body={body} href={href} />
      {children}
    </section>
  );
}

export function PageTitle({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line pb-6 pt-2 md:pb-8 md:pt-4">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="serif mt-2 text-3xl font-bold md:text-[2.6rem]">{title}</h1>
      {body ? <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">{body}</p> : null}
      {children}
    </div>
  );
}
