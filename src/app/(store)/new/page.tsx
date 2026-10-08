import { PageTitle, ProductGrid } from "@/components/ui";
import { getSession } from "@/lib/session";
import { storeProducts } from "@/lib/store-data";

export const metadata = { title: "신상품" };

export default async function NewPage() {
  const { supabase } = await getSession();
  const { products } = await storeProducts(supabase, { newest: true, sort: "new" });
  const fresh = products.filter((item) => item.isNew);
  return (
    <div>
      <PageTitle eyebrow="New" title="새로 담갔어요" body="이번 계절에 새로 선보이는 잡사바의 맛. 처음 나온 상품부터 차례로 보여 드려요." />
      <div className="mt-8">
        <ProductGrid products={fresh.length > 0 ? fresh : products.slice(0, 12)} />
      </div>
    </div>
  );
}
