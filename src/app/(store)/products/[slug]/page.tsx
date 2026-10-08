import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product-purchase";
import { ReviewBox } from "@/components/review-box";
import { Flash } from "@/components/ui";
import { discountRate, formatDate, formatKRW } from "@/lib/format";
import { getProduct, listPosts, listReviews, listWishlist, loadPolicy } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { deleteReview, createPost } from "@/server/shop";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  if (!supabase) return <p>Supabase 연결 후 상품 상세가 표시됩니다.</p>;
  const { product } = await getProduct(supabase, slug);
  if (!product || (product.status !== "on_sale" && product.status !== "sold_out")) notFound();
  const [policy, reviews, questions, wishlist] = await Promise.all([
    loadPolicy(supabase),
    listReviews(supabase, product.id),
    listPosts(supabase, "product-qna", product.id),
    user ? listWishlist(supabase, user.id) : Promise.resolve({ ids: new Set<string>(), products: [], error: null }),
  ]);
  const rate = discountRate(product.listPrice, product.salePrice);
  const purchased = user
    ? await supabase
        .from("order_items")
        .select("id, orders!inner(user_id,status)")
        .eq("product_id", product.id)
        .eq("orders.user_id", user.id)
        .in("orders.status", ["paid", "preparing", "shipping", "delivered", "confirmed"])
        .limit(1)
    : { data: [] };
  const canReview = Array.isArray(purchased.data) && purchased.data.length > 0;

  return (
    <div>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {product.images.map((image) => (
            <img key={image.src} src={image.src} alt={image.alt} className="w-full rounded-[2rem] bg-[#efe7dc] object-cover" />
          ))}
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm text-muted">{product.categoryName}</p>
          <h1 className="serif mt-2 text-4xl">{product.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{product.summary}</p>
          <p className="mt-4 flex items-baseline gap-2">
            {rate > 0 ? <span className="text-xl font-semibold text-gochujang">{rate}%</span> : null}
            <span className="text-2xl font-semibold">{formatKRW(product.salePrice)}</span>
            {rate > 0 ? <span className="text-muted line-through">{formatKRW(product.listPrice)}</span> : null}
          </p>
          <div className="mt-6">
            <ProductPurchase
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                categoryId: product.categoryId,
                image: product.image,
                pointRateBps: product.pointRateBps,
                variants: product.variants,
              }}
              policy={policy}
              loggedIn={Boolean(user)}
              wished={wishlist.ids.has(product.id)}
            />
          </div>
        </div>
      </div>
      <nav className="mt-10 flex gap-4 overflow-x-auto border-b border-line text-sm" aria-label="상품 정보 탭">
        <a className="pb-3" href="#info">상품정보</a>
        <a className="pb-3" href="#reviews">리뷰</a>
        <a className="pb-3" href="#qna">Q&A</a>
        <a className="pb-3" href="#shipping">배송·교환·반품</a>
      </nav>
      <section id="info" className="grid gap-4 py-8 md:grid-cols-2">
        {[
          ["설명", product.description],
          ["원재료", product.ingredients],
          ["원산지", product.origin],
          ["알레르기", product.allergens],
          ["보관", product.storageMethod],
          ["소비기한", product.shelfLifePolicy],
          ["제조", product.manufacturer],
          ["판매", product.seller],
        ].map(([label, value]) => (
          <div key={label} className="panel p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{value || "-"}</p>
          </div>
        ))}
      </section>
      <section id="reviews" className="space-y-4 py-8">
        <h2 className="serif text-3xl">리뷰</h2>
        {canReview && user ? <ReviewBox productId={product.id} slug={product.slug} userId={user.id} /> : <p className="text-sm text-muted">결제 완료 후 리뷰를 쓸 수 있습니다.</p>}
        {reviews.reviews.map((review) => (
          <article key={review.id} className="panel p-4">
            <p className="text-sm text-gochujang">{"★".repeat(review.rating)}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.content}</p>
            <div className="mt-3 flex gap-2">
              {review.images.map((image) => (
                <img key={image.src} src={image.src} alt={image.alt} className="h-20 w-20 rounded-xl object-cover" />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {review.displayName}
              {review.isSeed ? " · 샘플" : ""} · {formatDate(review.createdAt)}
            </p>
            {user && review.userId === user.id ? (
              <form action={deleteReview} className="mt-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <button className="text-sm text-muted" type="submit">
                  삭제
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
      <section id="qna" className="space-y-4 py-8">
        <h2 className="serif text-3xl">Q&A</h2>
        {user ? (
          <form action={createPost} className="panel space-y-3 p-4">
            <input type="hidden" name="board" value="product-qna" />
            <input type="hidden" name="back" value={`/products/${product.slug}`} />
            <input type="hidden" name="productId" value={product.id} />
            <input className="field" name="title" required placeholder="질문 제목" />
            <textarea className="field min-h-24" name="content" required placeholder="질문 내용" />
            <label className="flex gap-2 text-sm"><input type="checkbox" name="secret" /> 비밀글</label>
            <button className="btn btn-primary" type="submit">질문 등록</button>
          </form>
        ) : (
          <Link href={`/login?next=/products/${product.slug}`} className="text-sm">
            로그인 후 질문할 수 있습니다.
          </Link>
        )}
        {questions.posts.map((post) => (
          <article key={post.id} className="panel p-4">
            <h3 className="font-medium">{post.isSecret ? "비밀 · " : ""}{post.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{post.content}</p>
          </article>
        ))}
      </section>
      <section id="shipping" className="panel p-5 text-sm leading-7">
        <h2 className="serif text-3xl">배송·교환·반품</h2>
        <p className="mt-3">{product.shippingNote}</p>
        <p>기본 배송비 {formatKRW(policy.baseShippingFee)}, 쿠폰 적용 후 상품 금액 {formatKRW(policy.freeShippingThreshold)} 이상 무료.</p>
        <p>출고 전 취소는 즉시 완료되고 재고·쿠폰·포인트가 복원됩니다. 출고 후에는 반품을 요청해 주세요.</p>
      </section>
    </div>
  );
}
