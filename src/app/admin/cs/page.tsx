import Link from "next/link";
import { Flash } from "@/components/ui";
import { listCs } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";
import { RETURN_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { answerInquiry, replyPost, resolveReturn } from "@/server/admin";

export const metadata = { title: "고객센터" };

export default async function CsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const data = await listCs(session.supabase);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="serif text-4xl">고객센터</h1>
        <div className="mt-4">
          <Flash notice={sp.notice} error={sp.error || data.error || undefined} />
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="serif text-2xl">1:1 문의</h2>
        {data.inquiries.map((item) => (
          <article key={item.id} className="panel p-4 text-sm">
            <p className="font-medium">
              {item.title} · {item.status === "answered" ? "답변완료" : "대기"}
            </p>
            <p className="text-muted">
              {item.author} · {item.category} · {formatDateTime(item.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
            {item.answer ? <p className="mt-2 whitespace-pre-wrap text-muted">답변: {item.answer}</p> : null}
            <form action={answerInquiry} className="mt-3 space-y-2">
              <input type="hidden" name="inquiryId" value={item.id} />
              <textarea className="field min-h-20" name="answer" required defaultValue={item.answer} aria-label="답변" />
              <button className="btn btn-primary" type="submit">
                답변 저장
              </button>
            </form>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="serif text-2xl">취소·반품</h2>
        {data.returns.map((item) => (
          <article key={item.id} className="panel p-4 text-sm">
            <p className="font-medium">
              {item.orderNo} · {item.type} · {labelOf(RETURN_STATUS_LABEL, item.status)}
            </p>
            <p className="text-muted">{formatDateTime(item.createdAt)}</p>
            <p className="mt-2">{item.reason}</p>
            <form action={resolveReturn} className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
              <input type="hidden" name="returnId" value={item.id} />
              <select className="field" name="status" defaultValue={item.status} aria-label="반품 상태">
                {Object.entries(RETURN_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input className="field" name="note" defaultValue={item.note} placeholder="관리 메모" aria-label="관리 메모" />
              <button className="btn btn-ghost" type="submit">
                변경
              </button>
            </form>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="serif text-2xl">게시글 답글</h2>
        <p className="text-sm text-muted">예약·픽업 게시판은 글과 답글만 남깁니다. 예약 확정 엔진은 없습니다.</p>
        {data.posts.map((post) => (
          <article key={post.id} className="panel p-4 text-sm">
            <p className="font-medium">{post.title}</p>
            <p className="text-muted">
              {post.board} · {post.author} · {formatDateTime(post.createdAt)}
              {post.slug === "qna" || post.slug === "free" || post.slug === "reservations" ? (
                <>
                  {" "}
                  · <Link href={`/community/${post.slug}/${post.id}`}>보기</Link>
                </>
              ) : null}
            </p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
            <form action={replyPost} className="mt-3 space-y-2">
              <input type="hidden" name="postId" value={post.id} />
              <textarea className="field min-h-16" name="content" required placeholder="관리자 답글" aria-label="답글" />
              <button className="btn btn-ghost" type="submit">
                답글
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
