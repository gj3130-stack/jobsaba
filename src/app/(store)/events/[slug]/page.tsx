import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ui";
import { listProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await getSession();
  if (!supabase) return <p>Supabase 연결 후 기획전이 표시됩니다.</p>;
  const { data } = await supabase.from("events").select("title,description,product_ids").eq("slug", slug).maybeSingle();
  if (!data || typeof data !== "object") notFound();
  const ids = Array.isArray(data.product_ids) ? data.product_ids.map(String) : [];
  const { products } = ids.length ? await listProducts(supabase, { ids }) : { products: [] };
  return (
    <div>
      <h1 className="serif text-4xl">{String(data.title)}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{String(data.description || "")}</p>
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
