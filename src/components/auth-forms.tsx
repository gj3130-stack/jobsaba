"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearGuestCart, readGuestCart } from "@/lib/guest-cart";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { findLoginId, mergeGuestCart } from "@/server/shop";

function authMessage(message: string) {
  if (/invalid login/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/already registered|already been registered/i.test(message)) return "이미 가입된 이메일입니다.";
  if (/password/i.test(message)) return "비밀번호는 8자 이상으로 설정해 주세요.";
  if (/email not confirmed/i.test(message)) return "이메일 인증 후 로그인해 주세요.";
  return message;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("회원 로그인은 오픈 준비 중이에요. 조금만 기다려 주세요.");
      return;
    }
    setPending(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    });
    if (error) {
      setPending(false);
      setMessage(authMessage(error.message));
      return;
    }
    const profile = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
    if (profile.data && typeof profile.data === "object" && "status" in profile.data && profile.data.status === "withdrawn") {
      await supabase.auth.signOut();
      setPending(false);
      setMessage("탈퇴한 계정입니다.");
      return;
    }
    const guest = readGuestCart();
    if (guest.length > 0) {
      await mergeGuestCart(guest.map((item) => ({ variantId: item.variantId, quantity: item.quantity })));
      clearGuestCart();
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-6">
      <label className="block text-sm">이메일<input className="field mt-1" name="email" type="email" required autoComplete="email" /></label>
      <label className="block text-sm">비밀번호<input className="field mt-1" name="password" type="password" required minLength={8} autoComplete="current-password" /></label>
      {message ? <p className="text-sm text-gochujang">{message}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending} type="submit">
        {pending ? "확인 중" : "로그인"}
      </button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("terms") !== "on" || form.get("privacy") !== "on") {
      setMessage("이용약관과 개인정보 처리에 동의해 주세요.");
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("회원 로그인은 오픈 준비 중이에요. 조금만 기다려 주세요.");
      return;
    }
    setPending(true);
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          name: String(form.get("name") || ""),
          phone: String(form.get("phone") || ""),
          marketing_agreed: form.get("marketing") === "on",
        },
      },
    });
    setPending(false);
    if (error) {
      setMessage(authMessage(error.message));
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setMessage("가입 메일을 확인해 주세요. 인증이 꺼져 있으면 바로 로그인할 수 있습니다.");
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-6">
      <label className="block text-sm">이름<input className="field mt-1" name="name" required /></label>
      <label className="block text-sm">이메일<input className="field mt-1" name="email" type="email" required /></label>
      <label className="block text-sm">전화번호<input className="field mt-1" name="phone" required placeholder="010-0000-0000" /></label>
      <label className="block text-sm">비밀번호<input className="field mt-1" name="password" type="password" required minLength={8} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="terms" required /> 이용약관 동의 (필수)</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="privacy" required /> 개인정보 수집 동의 (필수)</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="marketing" /> 할인·재입고 소식 수신 (선택)</label>
      <p className="text-xs leading-5 text-muted">가입이 끝나면 2,000P와 3,000원 쿠폰이 계정에 들어갑니다. 포인트는 1년 뒤 만료됩니다.</p>
      {message ? <p className="text-sm text-gochujang">{message}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending} type="submit">
        가입하기
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("회원 기능은 오픈 준비 중이에요. 조금만 기다려 주세요.");
      return;
    }
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    setMessage(error ? authMessage(error.message) : "재설정 메일을 보냈습니다. 받은편지함을 확인해 주세요.");
  }
  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-6">
      <label className="block text-sm">이메일<input className="field mt-1" name="email" type="email" required /></label>
      {message ? <p className="text-sm">{message}</p> : null}
      <button className="btn btn-primary w-full" type="submit">메일 보내기</button>
    </form>
  );
}

export function ForgotIdForm() {
  const [message, setMessage] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await findLoginId(new FormData(event.currentTarget));
    setMessage(result.ok ? `가입 이메일: ${result.masked}` : result.message);
  }
  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-6">
      <label className="block text-sm">이름<input className="field mt-1" name="name" required /></label>
      <label className="block text-sm">전화번호<input className="field mt-1" name="phone" required /></label>
      {message ? <p className="text-sm">{message}</p> : null}
      <button className="btn btn-primary w-full" type="submit">아이디 확인</button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(authMessage(error.message));
      return;
    }
    router.push("/login?notice=" + encodeURIComponent("비밀번호를 변경했습니다."));
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-6">
      <label className="block text-sm">새 비밀번호<input className="field mt-1" name="password" type="password" required minLength={8} /></label>
      {message ? <p className="text-sm text-gochujang">{message}</p> : null}
      <button className="btn btn-primary w-full" type="submit">변경</button>
    </form>
  );
}
