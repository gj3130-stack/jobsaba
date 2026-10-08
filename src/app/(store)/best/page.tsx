import { ProductGrid } from "@/components/ui";
import { listProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "베스트" };

export default async function BestPage() {
  const { supabase } = await getSession();
  const { products } = supabase ? await listProducts(supabase, { limit: 40 }) : { products: [] };
  const ordered = [...products].sort((a, b) => b.salesCount - a.salesCount);
  return (
    <div>
      <h1 className="serif text-4xl">베스트</h1>
      <p className="mt-2 text-sm text-muted">판매 수 기준으로 정렬했습니다.</p>
      <div className="mt-6">
        <ProductGrid products={ordered} />
      </div>
    </div>
  );
}
