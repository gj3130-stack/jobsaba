import { ProductCard, PageTitle } from "@/components/ui";
import { getSession } from "@/lib/session";
import { storeProducts } from "@/lib/store-data";

export const metadata = { title: "베스트" };

export default async function BestPage() {
  const { supabase } = await getSession();
  const { products } = await storeProducts(supabase, { limit: 40 });
  const ordered = [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 20);
  return (
    <div>
      <PageTitle eyebrow="Best 20" title="많이 잡숴 본 베스트" body="최근 판매량 순서로 줄 세웠어요. 처음이라면 위에서부터 한번 잡숴 보세요." />
      <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5">
        {ordered.map((product, index) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} rank={index + 1} priority={index < 4} />
          </li>
        ))}
      </ul>
    </div>
  );
}
