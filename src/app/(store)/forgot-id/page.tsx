import { ForgotIdForm } from "@/components/auth-forms";

export const metadata = { title: "아이디 확인" };

export default function ForgotIdPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-4xl">아이디 확인</h1>
      <p className="mt-2 text-sm text-muted">이름과 전화번호가 같으면 이메일을 일부만 보여 줍니다.</p>
      <div className="mt-4">
        <ForgotIdForm />
      </div>
    </div>
  );
}
