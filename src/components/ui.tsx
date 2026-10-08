import Link from "next/link";
import { discountRate, formatKRW } from "@/lib/format";
import type { ProductCard } from "@/lib/models";

export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-2xl bg-white px-4 py-3 text-sm text-gochujang ring-1 ring-gochujang/30">
        {error}
      </p>
    );
  }
  if (notice) return <p className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-line">{notice}</p>;
  return null;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-paper">{children}</span>;
}

export function Empty({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="panel px-6 py-12 text-center">
      <h2 className="serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {href && action ? (
        <Link href={href} className="btn btn-primary mt-5">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCard[] }) {
  if (products.length === 0) {
    return <Empty title="해당하는 상품이 없습니다." body="다른 카테고리나 검색어로 다시 찾아 보세요." href="/search" action="검색으로" />;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export function ProductCard({ product }: { product: ProductCard }) {
  const rate = discountRate(product.listPrice, product.salePrice);
  const soldOut = product.stock <= 0 || product.status !== "on_sale";
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-[#efe7dc]">
        <img src={product.image} alt={product.imageAlt} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.isOnePlusOne ? <Badge>1+1</Badge> : null}
          {product.isNew ? <Badge>신상</Badge> : null}
          {soldOut ? <Badge>품절</Badge> : null}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs text-muted">{product.categoryName}</p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium leading-snug">
          {product.name}
        </Link>
        <p className="line-clamp-2 text-xs leading-5 text-muted">{product.summary}</p>
        <p className="mt-auto flex items-baseline gap-2 pt-2">
          {rate > 0 ? <span className="text-sm font-semibold text-gochujang">{rate}%</span> : null}
          <span className="font-semibold">{formatKRW(product.salePrice)}</span>
          {rate > 0 ? <span className="text-xs text-muted line-through">{formatKRW(product.listPrice)}</span> : null}
        </p>
      </div>
    </article>
  );
}

export function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="serif text-2xl md:text-3xl">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-muted">
            더 보기
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
