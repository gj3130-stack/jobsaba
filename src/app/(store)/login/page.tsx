import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { LogoIcon } from "@/components/brand";
import { Flash } from "@/components/ui";
import { safeNextPath } from "@/lib/form";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next);
  const ready = supabaseEnv().configured;
  return (
    <div className="mx-auto max-w-md py-6 md:py-10">
      <div className="text-center">
        <LogoIcon size={56} className="mx-auto" />
        <h1 className="serif mt-5 text-3xl font-bold">로그인</h1>
        <p className="mt-2 text-sm text-muted">잡사바 회원이 되면 첫 주문 쿠폰과 1% 적립을 드려요.</p>
      </div>
      {!ready ? (
        <div className="mt-6 rounded-2xl bg-paper p-5 text-sm leading-6 ring-1 ring-line">
          <p className="font-bold">회원 로그인·결제는 오픈 준비 중이에요</p>
          <p className="mt-1 text-muted">
            지금은 상품 구경과 장바구니 담기를 먼저 열어 두었어요. 담아 둔 상품은 이 브라우저에 저장되니, 결제가 열리면 바로 주문하실 수 있어요.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/cart" className="btn btn-dark">
              장바구니 보기
            </Link>
            <Link href="/best" className="btn btn-ghost">
              베스트 구경하기
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error} />
      </div>
      <div className="mt-4">
        <LoginForm nextPath={nextPath} />
      </div>
      <p className="mt-5 flex justify-center gap-4 text-sm text-muted">
        <Link href="/signup" className="font-semibold text-ink">회원가입</Link>
        <Link href="/forgot-id">아이디 찾기</Link>
        <Link href="/forgot-password">비밀번호 재설정</Link>
      </p>
    </div>
  );
}
