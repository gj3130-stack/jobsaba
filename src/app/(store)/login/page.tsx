import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { Flash } from "@/components/ui";
import { safeNextPath } from "@/lib/form";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-4xl">로그인</h1>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error} />
      </div>
      <div className="mt-4">
        <LoginForm nextPath={nextPath} />
      </div>
      <p className="mt-4 flex gap-3 text-sm">
        <Link href="/signup">회원가입</Link>
        <Link href="/forgot-id">아이디 확인</Link>
        <Link href="/forgot-password">비밀번호 재설정</Link>
      </p>
    </div>
  );
}
