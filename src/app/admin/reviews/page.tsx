import { Flash } from "@/components/ui";
import { listAdminReviews } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { toggleHiddenReview } from "@/server/admin";

export const metadata = { title: "리뷰" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { reviews, error } = await listAdminReviews(session.supabase);
  return (
    <div>
      <h1 className="serif text-4xl">리뷰</h1>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <ul className="mt-4 space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="panel p-4 text-sm">
            <p className="font-medium">
              {review.productName} · {review.rating}점 · {review.displayName}
              {review.seed ? " · 샘플" : ""}
              {review.hidden ? " · 숨김" : ""}
            </p>
            <p className="text-muted">{formatDate(review.createdAt)}</p>
            <p className="mt-2 whitespace-pre-wrap">{review.content}</p>
            <form action={toggleHiddenReview} className="mt-3">
              <input type="hidden" name="reviewId" value={review.id} />
              <input type="hidden" name="hidden" value={review.hidden ? "false" : "true"} />
              <button className="btn btn-ghost" type="submit">
                {review.hidden ? "다시 보이기" : "숨기기"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
