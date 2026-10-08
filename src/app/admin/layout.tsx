import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { requireAdmin } from "@/lib/session";

const LINKS = [
  ["/admin", "오늘"],
  ["/admin/members", "회원"],
  ["/admin/products", "상품"],
  ["/admin/orders", "주문"],
  ["/admin/inventory", "재고"],
  ["/admin/purchase-orders", "발주"],
  ["/admin/delivery", "배송"],
  ["/admin/cs", "고객센터"],
  ["/admin/promotions", "프로모션"],
  ["/admin/reviews", "리뷰"],
  ["/admin/documents", "증빙"],
];

export const metadata = { title: "관리" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  if (!session.supabase || !session.user) redirect("/login?next=/admin");
  if (!session.allowed) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="serif text-3xl">관리자만 들어올 수 있습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          회원가입한 뒤 Supabase SQL 편집기에서 해당 계정의 role을 admin으로 바꾸고 다시 로그인해 주세요.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          상점으로
        </Link>
      </main>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandMark className="h-10 w-10" />
            <span className="serif text-2xl">잡사바 관리</span>
          </Link>
          <Link href="/" className="text-sm text-muted">
            상점 보기
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-8 lg:grid-cols-[160px_1fr]">
        <nav aria-label="관리 메뉴" className="flex gap-3 overflow-x-auto text-sm lg:flex-col">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1 hover:bg-paper">
              {label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
