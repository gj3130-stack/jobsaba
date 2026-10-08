import Link from "next/link";

const LINKS = [
  ["/my", "홈"],
  ["/my/orders", "주문"],
  ["/my/cancellations", "취소"],
  ["/my/returns", "반품"],
  ["/my/refunds", "환불"],
  ["/my/payments", "결제"],
  ["/my/wishlist", "찜"],
  ["/my/points", "포인트"],
  ["/my/coupons", "쿠폰"],
  ["/my/inquiries", "문의"],
  ["/my/profile", "정보"],
];

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
      <nav aria-label="마이페이지" className="flex gap-3 overflow-x-auto text-sm lg:flex-col">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="shrink-0">
            {label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
