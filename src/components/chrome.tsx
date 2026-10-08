"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo, LogoIcon } from "@/components/brand";
import { CartIcon, ChatIcon, CloseIcon, GridIcon, HomeIcon, SearchIcon, UserIcon } from "@/components/icons";
import { readGuestCart } from "@/lib/guest-cart";
import { CATEGORY_NAV, SHOP_LINKS } from "@/lib/nav";
import { logout } from "@/server/shop";

function useGuestCount() {
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
  return count;
}

function CountBubble({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gochujang px-1 text-[10px] font-bold text-white ring-2 ring-paper">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function GuestCartBadge() {
  const count = useGuestCount();
  return <CountBubble count={count} />;
}

function CartCount({ member, memberCount }: { member: boolean; memberCount: number }) {
  const guest = useGuestCount();
  return <CountBubble count={member ? memberCount : guest} />;
}

const MOBILE = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/category", label: "카테고리", Icon: GridIcon },
  { href: "/search", label: "검색", Icon: SearchIcon },
  { href: "/cart", label: "장바구니", Icon: CartIcon },
  { href: "/my", label: "마이", Icon: UserIcon },
];

export function MobileNav({ cartCount = 0, member = false }: { cartCount?: number; member?: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/products/")) return null;
  return (
    <nav aria-label="모바일 하단 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-bold text-gochujang" : "text-muted"}`}>
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.1 : 1.7} />
                  {href === "/cart" ? <CartCount member={member} memberCount={cartCount} /> : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const ANSWERS = [
  { keys: ["배송", "언제", "택배", "도착", "출고"], text: "평일 오후 2시 전 결제는 당일 출고됩니다. 냉장·냉동 상품은 신선도를 위해 금·토·일·공휴일에는 출고하지 않아요." },
  { keys: ["배송비", "무료"], text: "기본 배송비는 3,500원이고, 상품 금액 30,000원 이상이면 무료입니다. 제주 3,000원·도서산간 5,000원이 추가됩니다." },
  { keys: ["교환", "반품", "환불"], text: "출고 전에는 주문에서 바로 취소됩니다. 냉장·신선식품은 단순 변심 반품이 제한되고, 상품 하자는 사진과 함께 7일 안에 알려 주세요." },
  { keys: ["포인트", "적립"], text: "결제된 상품 금액의 1%가 적립됩니다. 1,000P부터 쓸 수 있고, 적립일로부터 1년 뒤 만료됩니다." },
  { keys: ["쿠폰"], text: "주문당 쿠폰은 한 장입니다. 가입 쿠폰은 20,000원 이상, 찬장 10% 쿠폰은 30,000원 이상에서 적용됩니다." },
  { keys: ["알레르기", "원재료", "성분"], text: "상품 상세의 ‘상품정보’ 탭과 상품정보제공고시 표에 원재료·함량과 알레르기 유발 성분을 적어 두었습니다." },
  { keys: ["보관", "냉장", "소비기한"], text: "상품마다 보관법이 달라요. 상세 페이지 ‘보관 방법’과 고시 표의 소비기한을 확인해 주세요." },
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "안녕하세요, 잡사바예요. 배송·배송비·교환·포인트·보관법을 짧게 물어보세요." },
  ]);
  const onProduct = pathname.startsWith("/products/");

  function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    const found = ANSWERS.find((item) => item.keys.some((key) => question.includes(key)));
    setLog((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "bot", text: found ? found.text : "그 질문은 1:1 문의로 남겨 주시면 영업일 기준 하루 안에 답해 드릴게요." },
    ]);
    setText("");
  }

  return (
    <div className={`fixed right-4 z-30 ${onProduct ? "hidden md:block" : "bottom-[76px]"} md:bottom-6`}>
      {open ? (
        <div className="mb-3 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl bg-paper shadow-2xl ring-1 ring-line">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-sm font-bold">
              <LogoIcon size={24} /> 잡사바 안내
            </p>
            <button type="button" aria-label="닫기" className="text-white/70" onClick={() => setOpen(false)}>
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto p-4 text-sm">
            {log.map((item, index) => (
              <p key={index} className={item.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-gochujang px-3 py-2 text-white" : "mr-8 rounded-2xl rounded-bl-sm bg-cream px-3 py-2 text-ink"}>
                {item.text}
              </p>
            ))}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-line p-3">
            <input className="field !py-2" value={text} onChange={(event) => setText(event.target.value)} placeholder="예: 배송은 언제인가요?" aria-label="챗봇 질문" />
            <button className="btn btn-dark !px-3 !py-2" type="submit">
              보내기
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="안내 챗봇 열기"
        className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg ring-4 ring-paper/70 transition hover:bg-black"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon size={20} /> : <ChatIcon size={22} />}
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
        <LogoIcon size={40} />
        <h2 className="serif mt-4 text-2xl font-bold">{popup.title}</h2>
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

const QUICK = ["참기름", "액젓", "고추장", "명란", "장아찌"];

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
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const cats = categories.length > 0 ? categories : [...CATEGORY_NAV];
  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="hidden bg-ink text-white md:block">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-2 text-xs">
          <p>
            <span className="font-bold text-[#ffb4ac]">30,000원 이상 무료배송</span>
            <span className="mx-2 text-white/30">|</span>평일 오후 2시 전 주문은 오늘 출고
          </p>
          <nav aria-label="회원" className="flex items-center gap-4 text-white/80">
            {isAdmin ? <Link href="/admin">관리자</Link> : null}
            {email ? (
              <>
                <Link href="/my">마이페이지</Link>
                <form action={logout}>
                  <button type="submit">로그아웃</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">로그인</Link>
                <Link href="/signup">회원가입</Link>
              </>
            )}
            <Link href="/support">고객센터</Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 md:gap-8 md:px-8 md:py-4">
        <Link href="/" aria-label="잡사바 홈" className="shrink-0">
          <span className="md:hidden">
            <Logo size={34} />
          </span>
          <span className="hidden md:inline">
            <Logo size={44} />
          </span>
        </Link>
        <form className="relative hidden min-w-0 max-w-xl flex-1 md:block" onSubmit={submit}>
          <label className="sr-only" htmlFor="site-search">
            상품 검색
          </label>
          <input
            id="site-search"
            className="w-full rounded-full border-2 border-ink/90 bg-white py-2.5 pl-5 pr-12 text-[15px] outline-none placeholder:text-muted/80 focus:border-gochujang"
            placeholder="참기름, 액젓, 보리고추장을 찾아보세요"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" aria-label="검색" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:text-gochujang">
            <SearchIcon size={22} strokeWidth={2.2} />
          </button>
          <div className="absolute left-5 top-full mt-1.5 flex gap-3 text-xs text-muted">
            {QUICK.map((word) => (
              <Link key={word} href={`/search?q=${encodeURIComponent(word)}`} className="hover:text-gochujang">
                #{word}
              </Link>
            ))}
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Link href="/search" aria-label="검색" className="flex h-10 w-10 items-center justify-center rounded-full md:hidden">
            <SearchIcon size={23} />
          </Link>
          <Link href={email ? "/my" : "/login"} aria-label="마이페이지" className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-cream md:flex">
            <UserIcon size={25} />
          </Link>
          <Link href="/cart" aria-label="장바구니" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream md:h-11 md:w-11">
            <span className="relative">
              <CartIcon size={25} />
              <CartCount member={Boolean(email)} memberCount={cartCount} />
            </span>
          </Link>
        </div>
      </div>
      <nav aria-label="카테고리" className="border-t border-line/70">
        <div className="scrollbar-none mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-2 text-[15px] [mask-image:linear-gradient(to_right,black_85%,transparent)] md:gap-2 md:px-6 md:[mask-image:none]">
          <Link href="/category" className={`shrink-0 px-3 py-3 font-bold ${pathname === "/category" ? "text-gochujang" : ""}`}>
            전체
          </Link>
          {cats.map((category) => {
            const active = pathname === `/category/${category.slug}`;
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={`relative shrink-0 px-3 py-3 font-semibold transition hover:text-gochujang ${active ? "text-gochujang after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-gochujang" : ""}`}
              >
                {category.name}
              </Link>
            );
          })}
          <span className="mx-1 hidden h-4 w-px bg-line md:block" />
          {SHOP_LINKS.filter((link) => link.href !== "/search").map((link) => (
            <Link key={link.href} href={link.href} className={`shrink-0 px-3 py-3 font-medium ${pathname.startsWith(link.href) ? "text-gochujang" : "text-muted hover:text-ink"}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/community/qna" className="hidden shrink-0 px-3 py-3 font-medium text-muted hover:text-ink md:block">
            커뮤니티
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 bg-ink text-white/70">
      <div className="mx-auto max-w-[1440px] px-5 pb-28 pt-12 md:px-8 md:pb-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo size={44} tone="light" />
            <p className="serif mt-5 text-xl font-bold text-white">한번 잡숨봐.</p>
            <p className="mt-2 max-w-xs text-sm leading-6">
              ‘잡사바’는 ‘잡숴 봐’의 정다운 말. 우리 집 밥상에 한 숟갈 더하는 참기름·장·젓갈을 만듭니다.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">쇼핑</p>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORY_NAV.map((item) => (
                <li key={item.slug}>
                  <Link href={`/category/${item.slug}`} className="hover:text-white">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-white">고객 안내</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/support/notice" className="hover:text-white">공지사항</Link></li>
              <li><Link href="/support/faq" className="hover:text-white">자주 묻는 질문</Link></li>
              <li><Link href="/support/inquiry" className="hover:text-white">1:1 문의</Link></li>
              <li><Link href="/community/qna" className="hover:text-white">상품 Q&amp;A</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm font-bold text-white">고객센터 (예시)</p>
            <p className="mt-3 text-2xl font-bold text-white">1588-0000</p>
            <p className="mt-1 text-sm">평일 10:00 – 17:00 · 점심 12:00 – 13:00</p>
            <p className="mt-4 text-sm leading-6">
              기본 배송비 3,500원 · 30,000원 이상 무료
              <br />
              제주 +3,000원 · 도서산간 +5,000원
              <br />
              냉장·냉동 상품은 금·토·일·공휴일 출고하지 않습니다.
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-white/50">
          <p>
            상호 잡사바 (예시) · 대표 홍길동 (예시) · 사업자등록번호 000-00-00000 (예시) · 통신판매업신고 제0000-전북순창-0000호 (예시)
          </p>
          <p>주소 전라북도 순창군 장류로 00 (예시) · 개인정보보호책임자 홍길동 (예시) · 이메일 hello@jobsaba.example</p>
          <p className="mt-2">© 2026 jobsaba. 위 사업자 정보는 오픈 전 실제 정보로 교체될 예시입니다.</p>
        </div>
      </div>
    </footer>
  );
}
