"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readGuestCart } from "@/lib/guest-cart";
import { CATEGORY_NAV, SHOP_LINKS } from "@/lib/nav";
import { logout } from "@/server/shop";

const MOBILE = [
  { href: "/", label: "홈" },
  { href: "/category", label: "카테고리" },
  { href: "/search", label: "검색" },
  { href: "/cart", label: "장바구니" },
  { href: "/my", label: "마이" },
];

export function GuestCartBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(readGuestCart().reduce((sum, item) => sum + item.quantity, 0));
    sync();
    window.addEventListener("jobsaba-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jobsaba-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (!count) return null;
  return <span className="ml-1 rounded-full bg-gochujang px-1.5 text-[11px] text-white">{count}</span>;
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="모바일 하단 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper md:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`flex h-16 items-center justify-center text-xs ${active ? "font-semibold text-gochujang" : "text-muted"}`}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const ANSWERS = [
  { keys: ["배송", "언제", "택배", "도착"], text: "결제 다음 날 출고가 기본이고, 주문 상태는 마이페이지에서 준비·배송중·배송완료로 볼 수 있습니다." },
  { keys: ["교환", "반품"], text: "출고 전에는 주문에서 바로 취소됩니다. 출고 후에는 반품을 요청해 주세요. 식품은 개봉 후 단순 변심이 제한될 수 있습니다." },
  { keys: ["포인트", "적립"], text: "결제된 상품 금액의 1%가 적립됩니다. 1,000P부터 쓸 수 있고, 적립일로부터 1년 뒤 만료됩니다." },
  { keys: ["쿠폰"], text: "주문당 쿠폰은 한 장입니다. 가입 쿠폰은 20,000원 이상, 찬장 10% 쿠폰은 30,000원 이상에서 적용됩니다." },
  { keys: ["알레르기", "원재료"], text: "상품 상세의 상품정보 탭에 원재료와 알레르기를 적어 두었습니다. 세트는 구성품 라벨도 확인해 주세요." },
  { keys: ["취소"], text: "상품 준비 전까지는 취소와 함께 포인트·쿠폰·재고가 복원됩니다. 배송이 시작되면 반품 요청으로 이어집니다." },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "배송, 교환, 포인트, 쿠폰, 알레르기를 짧게 물어보세요. 주문 조회 연동은 다음 단계입니다." },
  ]);

  function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    const found = ANSWERS.find((item) => item.keys.some((key) => question.includes(key)));
    setLog((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "bot", text: found ? found.text : "그 질문은 1:1 문의나 자주 묻는 질문에 더 정확히 남아 있습니다." },
    ]);
    setText("");
  }

  return (
    <div className="fixed bottom-20 right-4 z-30 md:bottom-6">
      {open ? (
        <div className="mb-3 w-[min(100vw-2rem,22rem)] rounded-3xl bg-paper p-4 shadow-xl ring-1 ring-line">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">잡사바 안내</p>
            <button type="button" className="text-sm text-muted" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto text-sm">
            {log.map((item, index) => (
              <p key={index} className={item.role === "user" ? "text-right" : "text-muted"}>
                {item.text}
              </p>
            ))}
          </div>
          <form onSubmit={ask} className="mt-3 flex gap-2">
            <input className="field" value={text} onChange={(event) => setText(event.target.value)} placeholder="예: 배송은 언제인가요?" aria-label="챗봇 질문" />
            <button className="btn btn-primary" type="submit">
              보내기
            </button>
          </form>
        </div>
      ) : null}
      <button type="button" className="btn btn-primary shadow-lg" onClick={() => setOpen((value) => !value)}>
        안내 챗봇
      </button>
    </div>
  );
}

export function HomePopup({ popup }: { popup: { id: string; title: string; body: string; link: string } }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `jobsaba.popup.${popup.id}`;
    if (!window.sessionStorage.getItem(key)) setOpen(true);
  }, [popup.id]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6">
        <p className="text-sm text-gochujang">잡사바</p>
        <h2 className="serif mt-2 text-3xl">{popup.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{popup.body}</p>
        <div className="mt-5 flex gap-2">
          <Link href={popup.link || "/signup"} className="btn btn-primary">
            자세히
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              window.sessionStorage.setItem(`jobsaba.popup.${popup.id}`, "1");
              setOpen(false);
            }}
          >
            오늘 닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export function Header({
  categories,
  cartCount,
  email,
  isAdmin,
}: {
  categories: { slug: string; name: string }[];
  cartCount: number;
  email: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const cats = categories.length > 0 ? categories : [...CATEGORY_NAV];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="serif inline-flex h-10 w-10 items-center justify-center rounded-full bg-gochujang text-sm text-white">사바</span>
          <span>
            <span className="serif block text-xl leading-none">잡사바</span>
            <span className="text-[10px] tracking-[0.2em] text-muted">FOOD</span>
          </span>
        </Link>
        <form
          className="hidden min-w-0 flex-1 md:block"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <label className="sr-only" htmlFor="site-search">
            상품 검색
          </label>
          <input id="site-search" className="field" placeholder="된장, 양념장, 젓갈" value={query} onChange={(event) => setQuery(event.target.value)} />
        </form>
        <nav aria-label="회원" className="ml-auto flex items-center gap-3 text-sm">
          {isAdmin ? <Link href="/admin">관리</Link> : null}
          <Link href="/support">고객센터</Link>
          {email ? (
            <form action={logout}>
              <button className="text-sm" type="submit">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/login">로그인</Link>
          )}
          <Link href="/cart" className="font-medium">
            장바구니
            {email ? cartCount > 0 ? <span className="ml-1 rounded-full bg-gochujang px-1.5 text-[11px] text-white">{cartCount}</span> : null : <GuestCartBadge />}
          </Link>
        </nav>
      </div>
      <div className="mx-auto hidden max-w-[1440px] items-center gap-5 overflow-x-auto px-4 pb-3 text-sm md:flex md:px-8">
        {cats.map((category) => (
          <Link key={category.slug} href={`/category/${category.slug}`} className="shrink-0">
            {category.name}
          </Link>
        ))}
        <span className="text-line">|</span>
        {SHOP_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 text-muted">
            {link.label}
          </Link>
        ))}
        <Link href="/community/qna" className="shrink-0 text-muted">
          커뮤니티
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 text-sm text-muted md:grid-cols-4 md:px-8">
        <div>
          <p className="serif text-2xl text-ink">잡사바</p>
          <p className="mt-2 leading-6">밥상에 바로 올리는 소스, 장류, 장아찌, 반찬, 젓갈.</p>
        </div>
        <div>
          <p className="font-medium text-ink">안내</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/support/notice">공지</Link></li>
            <li><Link href="/support/faq">자주 묻는 질문</Link></li>
            <li><Link href="/support/inquiry">1:1 문의</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">운영</p>
          <p className="mt-2 leading-6">상호 잡사바 · 통신판매 신고와 사업자 정보는 오픈 전 등록합니다.</p>
        </div>
        <div>
          <p className="font-medium text-ink">배송</p>
          <p className="mt-2 leading-6">기본 배송비 3,000원. 쿠폰 적용 후 상품 금액 40,000원 이상 무료.</p>
        </div>
      </div>
    </footer>
  );
}
