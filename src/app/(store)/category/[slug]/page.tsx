import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ui";
import { listCategories, listProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await getSession();
  if (!supabase) return <p>Supabase 연결 후 카테고리 상품이 표시됩니다.</p>;
  const categories = await listCategories(supabase);
  const category = categories.categories.find((item) => item.slug === slug);
  if (slug !== "all" && !category) notFound();
  const { products, error } = await listProducts(supabase, { categorySlug: slug, sort: "new" });
  return (
    <div>
      <h1 className="serif text-4xl">{slug === "all" ? "전체 상품" : category?.name}</h1>
      <p className="mt-2 text-sm text-muted">{category?.description}</p>
      {error ? <p className="mt-3 text-sm text-gochujang">{error}</p> : null}
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
