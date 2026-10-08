import Link from "next/link";
import { ProductGrid } from "@/components/ui";
import { listCategories, listProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "검색" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; stock?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await getSession();
  const categories = supabase ? await listCategories(supabase) : { categories: [] };
  const result = supabase
    ? await listProducts(supabase, {
        query: sp.q,
        categorySlug: sp.category,
        sort: sp.sort,
        inStock: sp.stock === "1",
      })
    : { products: [], error: null };
  return (
    <div>
      <h1 className="serif text-4xl">검색</h1>
      <form className="mt-4 grid gap-3 md:grid-cols-4">
        <input className="field md:col-span-2" name="q" defaultValue={sp.q} placeholder="상품명" aria-label="검색어" />
        <select className="field" name="category" defaultValue={sp.category || ""} aria-label="카테고리">
          <option value="">모든 카테고리</option>
          {categories.categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select className="field" name="sort" defaultValue={sp.sort || ""} aria-label="정렬">
          <option value="">판매량</option>
          <option value="new">신상품</option>
          <option value="price_asc">낮은 가격</option>
          <option value="price_desc">높은 가격</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === "1"} /> 재고 있는 상품
        </label>
        <button className="btn btn-primary" type="submit">
          적용
        </button>
      </form>
      {result.error ? <p className="mt-3 text-sm text-gochujang">{result.error}</p> : null}
      <div className="mt-6">
        <ProductGrid products={result.products} />
      </div>
      <p className="mt-4 text-sm">
        <Link href="/best">베스트</Link> · <Link href="/new">신상품</Link>
      </p>
    </div>
  );
}
