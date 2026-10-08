import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-4xl">회원가입</h1>
      <p className="mt-2 text-sm text-muted">이메일로 가입합니다. 약관에 동의하면 계정이 만들어집니다.</p>
      <div className="mt-4">
        <SignupForm />
      </div>
    </div>
  );
}
