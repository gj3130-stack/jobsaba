import { ProductGrid } from "@/components/ui";
import { listProducts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "신상품" };

export default async function NewPage() {
  const { supabase } = await getSession();
  const { products } = supabase ? await listProducts(supabase, { newest: true, sort: "new" }) : { products: [] };
  return (
    <div>
      <h1 className="serif text-4xl">신상품</h1>
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
