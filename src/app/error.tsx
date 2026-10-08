"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="serif text-3xl">화면을 열지 못했습니다.</h1>
      <p className="text-sm text-muted">{error.message}</p>
      <button type="button" className="btn btn-primary w-fit" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
