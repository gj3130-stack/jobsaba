import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { Toolbar } from "@/components/listing";
import { PageTitle, ProductGrid } from "@/components/ui";
import { getSession } from "@/lib/session";
import { storeCategories, storeProducts } from "@/lib/store-data";

export const metadata = { title: "검색" };

const POPULAR = ["참기름", "들기름", "액젓", "보리고추장", "명란", "장아찌", "멸치볶음", "선물세트"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; stock?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await getSession();
  const categories = await storeCategories(supabase);
  const q = sp.q?.trim() ?? "";
  const result = await storeProducts(supabase, { query: q || undefined, categorySlug: sp.category || undefined, sort: sp.sort, inStock: sp.stock === "1" });
  return (
    <div>
      <PageTitle eyebrow="Search" title={q ? `‘${q}’ 검색 결과` : "무엇을 찾으세요?"}>
        <form className="mt-5 flex max-w-2xl flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <input className="field !rounded-full !py-3 !pl-5 !pr-12" name="q" defaultValue={q} placeholder="상품명, 원재료로 찾아보세요" aria-label="검색어" />
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
          </div>
          <select className="field !w-auto !rounded-full" name="category" defaultValue={sp.category || ""} aria-label="카테고리">
            <option value="">모든 카테고리</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <button className="btn btn-dark !rounded-full" type="submit">
            검색
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="text-muted">인기 검색어</span>
          {POPULAR.map((word) => (
            <Link key={word} href={`/search?q=${encodeURIComponent(word)}`} className={`font-semibold hover:text-gochujang ${word === q ? "text-gochujang" : ""}`}>
              #{word}
            </Link>
          ))}
        </div>
      </PageTitle>
      <div className="mt-6">
        <Toolbar base="/search" count={result.products.length} sort={sp.sort ?? ""} keep={{ q: q || undefined, category: sp.category || undefined }} />
      </div>
      {result.error ? <p className="mt-3 text-sm text-gochujang">{result.error}</p> : null}
      <div className="mt-6">
        <ProductGrid products={result.products} />
      </div>
    </div>
  );
}
