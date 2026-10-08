import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { catalogCategoryBySlug } from "@/lib/catalog-data";
import { getSession } from "@/lib/session";
import { storeCategories, storeProducts } from "@/lib/store-data";

export const metadata = { title: "카테고리" };

export default async function CategoryIndexPage() {
  const { supabase } = await getSession();
  const categories = await storeCategories(supabase);
  const { products } = await storeProducts(supabase, { limit: 200 });
  return (
    <div>
      <PageTitle eyebrow="Category" title="카테고리" body="기름과 소스부터 장, 젓갈, 반찬, 선물세트까지. 잡사바 찬장을 한눈에 둘러보세요." />
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const items = products.filter((item) => item.categorySlug === category.slug);
          const meta = catalogCategoryBySlug(category.slug);
          return (
            <li key={category.id}>
              <Link href={`/category/${category.slug}`} className="group block rounded-2xl bg-paper p-5 ring-1 ring-line transition hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="serif text-2xl font-bold">{category.name}</p>
                    <p className="mt-1 text-sm text-muted">{meta?.tagline ?? category.description}</p>
                  </div>
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-gochujang">
                    {items.length}개 <ChevronRight size={16} />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {items.slice(0, 4).map((item) => (
                    <img key={item.id} src={item.image} alt={item.imageAlt} className="aspect-square w-full rounded-xl bg-cream-deep object-cover" />
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/category/all" className="btn btn-dark mt-8">
        전체 상품 {products.length}개 보기 <ChevronRight size={16} />
      </Link>
    </div>
  );
}
