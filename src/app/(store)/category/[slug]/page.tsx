import Link from "next/link";
import { notFound } from "next/navigation";
import { Chips, Toolbar } from "@/components/listing";
import { PageTitle, ProductGrid } from "@/components/ui";
import { catalogCategoryBySlug } from "@/lib/catalog-data";
import { getSession } from "@/lib/session";
import { storeCategories, storeProducts, tagsFor } from "@/lib/store-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug === "all" ? "전체 상품" : (catalogCategoryBySlug(slug)?.name ?? "카테고리") };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase } = await getSession();
  const categories = await storeCategories(supabase);
  const category = categories.find((item) => item.slug === slug);
  if (slug !== "all" && !category) notFound();
  const sort = sp.sort ?? "";
  const tag = sp.tag ?? "";
  const { products, error } = await storeProducts(supabase, { categorySlug: slug, sort, tag: tag || undefined });
  const meta = catalogCategoryBySlug(slug);
  const tags = slug === "all" ? [] : tagsFor(slug).map((value) => ({ value, label: value }));
  const base = `/category/${slug}`;
  return (
    <div>
      <PageTitle eyebrow={meta?.tagline ?? "jobsaba pantry"} title={slug === "all" ? "전체 상품" : (category?.name ?? "")} body={category?.description || meta?.description} />
      {slug === "all" ? (
        <div className="mt-6">
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            <span className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">전체</span>
            {categories.map((item) => (
              <Link key={item.slug} href={`/category/${item.slug}`} className="shrink-0 rounded-full bg-paper px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-ink">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ) : tags.length > 1 ? (
        <div className="mt-6">
          <Chips base={base} active={tag} keep={{ sort: sort || undefined }} items={[{ value: "", label: "전체" }, ...tags]} />
        </div>
      ) : null}
      <div className="mt-6">
        <Toolbar base={base} count={products.length} sort={sort} keep={{ tag: tag || undefined }} />
      </div>
      {error ? <p className="mt-3 text-sm text-gochujang">{error}</p> : null}
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
