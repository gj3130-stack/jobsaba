import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm text-gochujang">404</p>
      <h1 className="serif text-4xl">이 주소에는 상품이 없습니다.</h1>
      <Link href="/" className="btn btn-primary">
        홈으로
      </Link>
    </main>
  );
}
