import Link from "next/link";
import { formatPoint } from "@/lib/format";
import { pointBalanceOf } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "마이페이지" };

export default async function MyHomePage() {
  const { supabase, user, profile } = await getSession();
  const points = supabase && user ? await pointBalanceOf(supabase, user.id) : { balance: 0 };
  return (
    <div>
      <h1 className="serif text-4xl">{profile?.name || "회원"}님</h1>
      <p className="mt-2 text-sm text-muted">{profile?.email} · {profile?.status === "active" ? "정상" : profile?.status}</p>
      <p className="serif mt-6 text-3xl">{formatPoint(points.balance)}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ["/my/orders", "주문내역"],
          ["/my/cancellations", "취소"],
          ["/cart", "장바구니"],
          ["/my/wishlist", "찜"],
          ["/my/coupons", "쿠폰"],
          ["/my/inquiries", "문의"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="panel p-4 font-medium">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
