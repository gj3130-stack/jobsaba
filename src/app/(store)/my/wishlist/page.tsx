import { ProductGrid } from "@/components/ui";
import { listWishlist } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "찜" };

export default async function WishlistPage() {
  const { supabase, user } = await getSession();
  const { products } = supabase && user ? await listWishlist(supabase, user.id) : { products: [] };
  return (
    <div>
      <h1 className="serif mb-6 text-4xl">찜</h1>
      <ProductGrid products={products} />
    </div>
  );
}
