import { GuestCart, MemberCart } from "@/components/cart-view";
import { getCart } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "장바구니" };

export default async function CartPage() {
  const { supabase, user } = await getSession();
  if (!user || !supabase) {
    return (
      <div>
        <h1 className="serif mb-6 text-4xl">장바구니</h1>
        <GuestCart />
      </div>
    );
  }
  const cart = await getCart(supabase, user.id);
  return (
    <div>
      <h1 className="serif mb-6 text-4xl">장바구니</h1>
      {cart.error ? <p className="mb-4 text-sm text-gochujang">{cart.error}</p> : null}
      <MemberCart lines={cart.lines} />
    </div>
  );
}
