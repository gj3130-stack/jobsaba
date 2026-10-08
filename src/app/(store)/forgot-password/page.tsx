import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "비밀번호 재설정" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-4xl">비밀번호 재설정</h1>
      <div className="mt-4">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
