import Link from "next/link";
import { notFound } from "next/navigation";
import { ClockIcon, LeafIcon, ShieldIcon, SnowIcon, TruckIcon, BowlIcon, ChevronRight } from "@/components/icons";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { ReviewBox } from "@/components/review-box";
import { Badge, Flash, ProductGrid, Stars } from "@/components/ui";
import { LogoIcon } from "@/components/brand";
import { catalogProductBySlug } from "@/lib/catalog-data";
import { discountRate, formatDate, formatKRW, formatPoint } from "@/lib/format";
import { listPosts, listWishlist } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { estimateShipDate, SHIPPING_DEFAULTS, STORAGE_LABEL } from "@/lib/shipping";
import { storePolicy, storeProduct, storeProducts, storeReviews } from "@/lib/store-data";
import { supabaseEnv } from "@/lib/supabase/env";
import { createPost, deleteReview } from "@/server/shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = catalogProductBySlug(slug);
  return product ? { title: product.name, description: product.summary } : { title: "상품" };
}

const POINT_ICONS = [LeafIcon, ClockIcon, ShieldIcon, BowlIcon];

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
  const product = await storeProduct(supabase, slug);
  if (!product || (product.status !== "on_sale" && product.status !== "sold_out")) notFound();
  const [policy, reviews, questions, wishlist, related] = await Promise.all([
    storePolicy(supabase),
    storeReviews(supabase, { id: product.id, slug: product.slug }),
    supabase ? listPosts(supabase, "product-qna", product.id) : Promise.resolve({ posts: [], error: null }),
    supabase && user ? listWishlist(supabase, user.id) : Promise.resolve({ ids: new Set<string>(), products: [], error: null }),
    storeProducts(supabase, { categorySlug: product.categorySlug, limit: 12 }),
  ]);
  const purchased =
    supabase && user
      ? await supabase
          .from("order_items")
          .select("id, orders!inner(user_id,status)")
          .eq("product_id", product.id)
          .eq("orders.user_id", user.id)
          .in("orders.status", ["paid", "preparing", "shipping", "delivered", "confirmed"])
          .limit(1)
      : { data: [] };
  const canReview = Array.isArray(purchased.data) && purchased.data.length > 0;

  const storage = product.storageType ?? "room";
  const cold = storage !== "room";
  const ship = estimateShipDate(storage);
  const rate = discountRate(product.listPrice, product.salePrice);
  const earn = Math.floor((product.salePrice * product.pointRateBps) / 10000);
  const extra = product.extra;
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((score) => ({ score, count: reviews.filter((review) => review.rating === score).length }));
  const others = related.products.filter((item) => item.id !== product.id).slice(0, 5);
  const detailImages = product.images.slice(1);
  const notice: [string, string][] =
    extra?.notice ?? [
      ["제품명", product.name],
      ["원재료명 및 함량", product.ingredients],
      ["원산지", product.origin],
      ["알레르기", product.allergens],
      ["보관방법", product.storageMethod],
      ["소비기한", product.shelfLifePolicy],
      ["제조원", product.manufacturer],
      ["판매원", product.seller],
    ];

  const badges = (
    <>
      {product.isBest ? <Badge tone="best">BEST</Badge> : null}
      {product.isNew ? <Badge tone="new">NEW</Badge> : null}
      {product.isOnePlusOne ? <Badge tone="plus">1+1</Badge> : null}
      {storage === "refrigerated" ? <Badge tone="cold">❄ 냉장</Badge> : storage === "frozen" ? <Badge tone="frozen">❄ 냉동</Badge> : null}
    </>
  );

  return (
    <div className="pb-24 md:pb-0">
      <Flash notice={sp.notice} error={sp.error} />
      <nav aria-label="현재 위치" className="mb-4 flex items-center gap-1 text-xs text-muted md:mb-6 md:text-sm">
        <Link href="/" className="hover:text-ink">홈</Link>
        <ChevronRight size={14} />
        <Link href={`/category/${product.categorySlug}`} className="hover:text-ink">{product.categoryName}</Link>
        {product.tag && product.tag !== product.categoryName ? (
          <>
            <ChevronRight size={14} />
            <Link href={`/category/${product.categorySlug}?tag=${encodeURIComponent(product.tag)}`} className="hover:text-ink">{product.tag}</Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-6 md:gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:gap-14">
        <ProductGallery images={product.images} badges={badges} />

        <div className="min-w-0 lg:sticky lg:top-44 lg:self-start">
          <p className="text-sm font-semibold text-gochujang">
            {product.categoryName}
            {product.tag && product.tag !== product.categoryName ? ` · ${product.tag}` : ""}
          </p>
          <h1 className="serif mt-2 text-[1.75rem] font-bold leading-tight md:text-[2.2rem]">{product.name}</h1>
          <p className="mt-2 text-[15px] leading-7 text-muted">{product.summary}</p>
          {reviews.length ? (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
              <Stars rating={avg} size={15} />
              <span className="font-bold">{avg.toFixed(1)}</span>
              <span className="text-muted underline underline-offset-2">리뷰 {reviews.length}개</span>
            </a>
          ) : null}

          <div className="mt-5 rounded-2xl bg-paper p-5 ring-1 ring-line">
            {rate > 0 ? <p className="text-sm text-muted line-through">정상가 {formatKRW(product.listPrice)}</p> : null}
            <p className="mt-0.5 flex items-baseline gap-2">
              {rate > 0 ? <span className="text-[1.75rem] font-extrabold text-gochujang">{rate}%</span> : null}
              <span className="text-[1.75rem] font-extrabold tracking-tight">{formatKRW(product.salePrice)}</span>
              <span className="text-sm text-muted">판매가</span>
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-semibold">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sesame text-[10px] text-white">P</span>
              구매 시 {formatPoint(earn)} 적립 예정 ({product.pointRateBps / 100}%)
            </p>
            <dl className="mt-4 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2.5 border-t border-line pt-4 text-sm">
              <dt className="flex items-center gap-1 text-muted"><TruckIcon size={15} /> 배송비</dt>
              <dd>
                {formatKRW(policy.baseShippingFee)} <span className="text-muted">· {formatKRW(policy.freeShippingThreshold)} 이상 무료</span>
                <span className="block text-xs text-muted">제주 +{formatKRW(SHIPPING_DEFAULTS.jejuExtraFee)} · 도서산간 +{formatKRW(SHIPPING_DEFAULTS.remoteExtraFee)}</span>
              </dd>
              <dt className="flex items-center gap-1 text-muted"><ClockIcon size={15} /> 출고</dt>
              <dd>
                <span className="font-semibold text-leaf">{ship.today ? "오늘" : ship.label} 출고 예정</span>
                <span className="block text-xs text-muted">평일 오후 {SHIPPING_DEFAULTS.cutoffHour - 12}시 전 결제 시 당일 출고</span>
              </dd>
              <dt className="flex items-center gap-1 text-muted"><SnowIcon size={15} /> 보관</dt>
              <dd>{STORAGE_LABEL[storage]} 보관 · {product.storageMethod.split(".")[0]}</dd>
            </dl>
            {cold ? (
              <p className="mt-4 flex gap-2 rounded-xl bg-[#EAF2F9] px-3.5 py-3 text-xs leading-5 text-[#1F4E78]">
                <SnowIcon size={16} className="mt-0.5 shrink-0" />
                <span>
                  <b>{STORAGE_LABEL[storage]} 상품 안내</b> · 아이스박스와 아이스팩으로 포장해 보내 드려요. 신선도를 위해 <b>금·토·일·공휴일에는 출고하지 않으며</b>, 이 날 들어온 주문은 다음 영업일에 출고됩니다.
                </span>
              </p>
            ) : null}
          </div>

          <div className="mt-5">
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
              checkoutReady={supabaseEnv().configured}
            />
          </div>
        </div>
      </div>

      <nav className="sticky top-[103px] z-20 -mx-4 mt-12 border-b border-line bg-cream/95 px-4 backdrop-blur md:top-[166px] md:mx-0 md:mt-20 md:px-0" aria-label="상품 정보 탭">
        <ul className="grid grid-cols-4 text-center text-sm font-semibold md:text-[15px]">
          {[
            ["#info", "상품정보"],
            ["#reviews", `리뷰 ${reviews.length}`],
            ["#qna", "Q&A"],
            ["#shipping", "배송·교환"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="block border-b-2 border-transparent py-3.5 hover:border-ink md:py-4">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="info" className="mx-auto max-w-3xl scroll-mt-44 pt-10 md:scroll-mt-60 md:pt-16">
        <div className="text-center">
          <LogoIcon size={48} className="mx-auto" />
          <p className="eyebrow mt-4">jobsaba · 한번 잡숨봐</p>
          <h2 className="serif mx-auto mt-3 max-w-xl text-[1.7rem] font-bold leading-snug md:text-[2.3rem]">{product.summary}</h2>
          <p className="prose-detail mx-auto mt-5 max-w-2xl whitespace-pre-line text-[15px] text-ink/80 md:text-base">{extra?.story || product.description}</p>
        </div>

        {detailImages.length > 0 ? (
          <div className="mt-10 grid gap-3 md:mt-14">
            {detailImages.map((image) => (
              <img key={image.src} src={image.src} alt={image.alt} loading="lazy" className="w-full rounded-[1.5rem] bg-cream-deep object-cover" />
            ))}
          </div>
        ) : null}

        {extra && extra.points.length > 0 ? (
          <div className="mt-14 md:mt-20">
            <p className="eyebrow text-center">Point</p>
            <h3 className="serif mt-2 text-center text-2xl font-bold md:text-3xl">이래서 맛이 달라요</h3>
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {extra.points.map((point, index) => {
                const Icon = POINT_ICONS[index % POINT_ICONS.length];
                return (
                  <li key={point.title} className="flex gap-4 rounded-2xl bg-paper p-5 ring-1 ring-line">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gochujang-soft text-gochujang">
                      <Icon size={22} />
                    </span>
                    <span>
                      <span className="text-xs font-bold text-gochujang">POINT {String(index + 1).padStart(2, "0")}</span>
                      <span className="mt-0.5 block font-bold">{point.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted">{point.body}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {extra && (extra.howTo || extra.pairings.length > 0) ? (
          <div className="mt-14 rounded-[1.5rem] bg-ink p-6 text-white md:mt-20 md:p-10">
            <p className="eyebrow !text-[#ffb4ac]">How to eat</p>
            <h3 className="serif mt-2 text-2xl font-bold md:text-3xl">이렇게 잡숴 보세요</h3>
            {extra.howTo ? <p className="mt-4 text-[15px] leading-7 text-white/80">{extra.howTo}</p> : null}
            {extra.pairings.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {extra.pairings.map((pairing) => (
                  <li key={pairing} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
                    {pairing}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mt-14 grid gap-3 md:mt-20 md:grid-cols-3">
          {[
            { Icon: SnowIcon, title: "보관 방법", body: product.storageMethod },
            { Icon: ClockIcon, title: "소비기한", body: product.shelfLifePolicy },
            { Icon: ShieldIcon, title: "알레르기", body: product.allergens },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
              <Icon size={22} className="text-gochujang" />
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{body || "-"}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 md:mt-20">
          <h3 className="text-lg font-bold">상품정보제공고시</h3>
          <p className="mt-1 text-xs text-muted">식품(농수산물 · 가공식품) · 전자상거래 등에서의 상품 등의 정보제공에 관한 고시 기준</p>
          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-line">
            <table className="w-full text-left text-sm">
              <tbody>
                {notice.map(([label, value]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <th scope="row" className="w-[34%] bg-cream px-4 py-3 align-top text-xs font-semibold text-muted md:w-[28%] md:text-sm">
                      {label}
                    </th>
                    <td className="break-keep bg-paper px-4 py-3 leading-6">{value || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cold ? (
            <div className="mt-4 rounded-xl bg-gochujang-soft p-4 text-sm leading-6 text-gochujang-dark">
              <p className="font-bold">청약철회 제한 안내</p>
              <p className="mt-1">
                이 상품은 {STORAGE_LABEL[storage]} 보관이 필요한 신선식품으로, 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라 받으신 뒤 시간이 지나 다시 판매하기 어려운 경우
                단순 변심에 의한 교환·반품이 제한됩니다. 상품 하자·오배송은 수령 후 7일 안에 사진과 함께 알려 주시면 교환 또는 환불해 드려요.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-3xl scroll-mt-44 pt-16 md:scroll-mt-60 md:pt-24">
        <h2 className="serif text-2xl font-bold md:text-3xl">리뷰 <span className="text-gochujang">{reviews.length}</span></h2>
        {reviews.length > 0 ? (
          <div className="mt-5 grid items-center gap-6 rounded-2xl bg-paper p-6 ring-1 ring-line md:grid-cols-[auto_1fr]">
            <div className="text-center md:px-6">
              <p className="text-5xl font-extrabold">{avg.toFixed(1)}</p>
              <div className="mt-2">
                <Stars rating={avg} size={18} />
              </div>
            </div>
            <ul className="space-y-1.5">
              {dist.map(({ score, count }) => (
                <li key={score} className="flex items-center gap-3 text-xs text-muted">
                  <span className="w-6">{score}점</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                    <span className="block h-full rounded-full bg-gochujang" style={{ width: `${(count / reviews.length) * 100}%` }} />
                  </span>
                  <span className="w-5 text-right">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5">
          {canReview && user ? (
            <ReviewBox productId={product.id} slug={product.slug} userId={user.id} />
          ) : (
            <p className="rounded-xl bg-cream px-4 py-3 text-sm text-muted">구매하신 분만 리뷰를 남길 수 있어요. 리뷰를 쓰면 포인트를 드려요.</p>
          )}
        </div>
        <ul className="mt-4 divide-y divide-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex items-center justify-between gap-3">
                <Stars rating={review.rating} />
                <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{review.content}</p>
              {review.images.length ? (
                <div className="mt-3 flex gap-2">
                  {review.images.map((image) => (
                    <img key={image.src} src={image.src} alt={image.alt} className="h-20 w-20 rounded-xl object-cover" />
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {review.displayName}
                {review.isSeed ? " · 샘플 리뷰(예시)" : ""}
              </p>
              {user && review.userId === user.id ? (
                <form action={deleteReview} className="mt-2">
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="slug" value={product.slug} />
                  <button className="text-sm text-muted underline" type="submit">
                    삭제
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section id="qna" className="mx-auto max-w-3xl scroll-mt-44 pt-16 md:scroll-mt-60 md:pt-24">
        <h2 className="serif text-2xl font-bold md:text-3xl">상품 Q&amp;A</h2>
        <p className="mt-2 text-sm text-muted">상품에 대해 궁금한 점을 남겨 주세요. 영업일 기준 하루 안에 답해 드려요.</p>
        <div className="mt-5">
          {user ? (
            <form action={createPost} className="panel space-y-3 p-5">
              <input type="hidden" name="board" value="product-qna" />
              <input type="hidden" name="back" value={`/products/${product.slug}`} />
              <input type="hidden" name="productId" value={product.id} />
              <input className="field" name="title" required placeholder="질문 제목" />
              <textarea className="field min-h-24" name="content" required placeholder="질문 내용" />
              <label className="flex gap-2 text-sm">
                <input type="checkbox" name="secret" /> 비밀글
              </label>
              <button className="btn btn-dark" type="submit">
                질문 등록
              </button>
            </form>
          ) : (
            <Link href={`/login?next=/products/${product.slug}`} className="btn btn-ghost">
              로그인하고 질문하기
            </Link>
          )}
        </div>
        {questions.posts.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {questions.posts.map((post) => (
              <li key={post.id} className="py-4">
                <p className="font-semibold">
                  {post.isSecret ? "🔒 " : ""}
                  {post.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{post.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-paper px-4 py-6 text-center text-sm text-muted ring-1 ring-line">아직 등록된 질문이 없어요. 첫 질문을 남겨 주세요.</p>
        )}
      </section>

      <section id="shipping" className="mx-auto max-w-3xl scroll-mt-44 pt-16 md:scroll-mt-60 md:pt-24">
        <h2 className="serif text-2xl font-bold md:text-3xl">배송 · 교환 · 반품</h2>
        <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <tbody>
              {[
                ["배송비", `기본 ${formatKRW(policy.baseShippingFee)} · 상품 금액 ${formatKRW(policy.freeShippingThreshold)} 이상 무료 · 제주 +${formatKRW(SHIPPING_DEFAULTS.jejuExtraFee)} · 도서산간 +${formatKRW(SHIPPING_DEFAULTS.remoteExtraFee)}`],
                ["출고", `평일 오후 ${SHIPPING_DEFAULTS.cutoffHour - 12}시 전 결제 완료 시 당일 출고 (주말·공휴일 제외). 배송은 출고 후 1~2일 걸려요.`],
                ["냉장·냉동 상품", "아이스박스·아이스팩 포장. 금·토·일·공휴일에는 출고하지 않으며 다음 영업일에 출고합니다. 상온 상품과 함께 주문하면 함께 냉장 포장해 보내 드려요."],
                ["교환·반품 신청", "마이페이지 > 주문 내역 또는 1:1 문의로 수령 후 7일 안에 신청해 주세요."],
                ["반품 비용", "단순 변심: 왕복 배송비 고객 부담 (상온 미개봉 상품만 가능) · 상품 하자·오배송: 잡사바 부담"],
                ["교환·반품이 어려운 경우", "냉장·냉동 등 신선식품의 단순 변심, 개봉하거나 일부 섭취한 경우, 고객 보관 부주의로 상품 가치가 떨어진 경우"],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <th scope="row" className="w-[30%] bg-cream px-4 py-3 align-top text-xs font-semibold text-muted md:w-[24%] md:text-sm">
                    {label}
                  </th>
                  <td className="bg-paper px-4 py-3 leading-6">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {product.shippingNote ? <p className="mt-3 text-sm text-muted">{product.shippingNote}</p> : null}
      </section>

      {others.length > 0 ? (
        <section className="mt-20 md:mt-28">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow">With</p>
              <h2 className="serif mt-1.5 text-2xl font-bold md:text-3xl">같이 잡숴 보면 좋은 {product.categoryName}</h2>
            </div>
            <Link href={`/category/${product.categorySlug}`} className="flex shrink-0 items-center text-sm font-semibold text-muted hover:text-ink">
              더보기 <ChevronRight size={16} />
            </Link>
          </div>
          <ProductGrid products={others} />
        </section>
      ) : null}
    </div>
  );
}
