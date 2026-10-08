import { GuestCart, MemberCart } from "@/components/cart-view";
import { PageTitle } from "@/components/ui";
import { getCart } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { storePolicy } from "@/lib/store-data";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "장바구니" };

export default async function CartPage() {
  const { supabase, user } = await getSession();
  const policy = await storePolicy(supabase);
  const cartPolicy = { baseShippingFee: policy.baseShippingFee, freeShippingThreshold: policy.freeShippingThreshold };
  if (!user || !supabase) {
    return (
      <div>
        <PageTitle title="장바구니" />
        <div className="mt-6">
          <GuestCart policy={cartPolicy} checkoutReady={supabaseEnv().configured} />
        </div>
      </div>
    );
  }
  const cart = await getCart(supabase, user.id);
  return (
    <div>
      <PageTitle title="장바구니" />
      {cart.error ? <p className="mt-4 text-sm text-gochujang">{cart.error}</p> : null}
      <div className="mt-6">
        <MemberCart lines={cart.lines} policy={cartPolicy} />
      </div>
    </div>
  );
}
