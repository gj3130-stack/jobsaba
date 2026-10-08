import { UpdatePasswordForm } from "@/components/auth-forms";

export const metadata = { title: "비밀번호 변경" };

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="serif text-4xl">새 비밀번호</h1>
      <div className="mt-4">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
