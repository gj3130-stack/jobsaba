import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveImage } from "@/lib/images";
import { DEFAULT_POLICY, type CouponPolicy, type ShopPolicy } from "@/lib/pricing";
import type {
  Address,
  CartLine,
  Category,
  CommentItem,
  OrderSummary,
  PostItem,
  ProductCard,
  ProductDetail,
  ReviewItem,
  VariantChoice,
} from "@/lib/models";

const PRODUCT_LIST = `
  id, slug, name, summary, status, is_best, is_new, is_one_plus_one, point_rate_bps,
  sales_count, created_at, category_id,
  categories ( id, slug, name ),
  product_variants ( id, list_price, sale_price, stock, is_active ),
  product_images ( storage_path, alt, sort_order )
`;

const PRODUCT_DETAIL = `
  id, slug, name, summary, description, origin, ingredients, allergens, storage_method,
  shelf_life_policy, manufacturer, seller, shipping_note, status, is_best, is_new,
  is_one_plus_one, point_rate_bps, sales_count, created_at, category_id,
  categories ( id, slug, name ),
  product_variants ( id, sku, option_name, list_price, sale_price, stock, safety_stock, is_active ),
  product_images ( storage_path, alt, sort_order )
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function one(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row)) : [];
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function messageOf(error: { message: string } | null) {
  return error ? error.message : null;
}

function mapCard(row: Record<string, unknown>): ProductCard | null {
  const category = one(row.categories);
  const variants = rows(row.product_variants).filter((variant) => variant.is_active !== false);
  const active = variants.length > 0 ? variants : rows(row.product_variants);
  if (active.length === 0) return null;
  const priced = [...active].sort((a, b) => num(a.sale_price) - num(b.sale_price))[0];
  const images = [...rows(row.product_images)].sort((a, b) => num(a.sort_order) - num(b.sort_order));
  const image = images[0];
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    summary: str(row.summary),
    status: str(row.status, "on_sale"),
    isBest: row.is_best === true,
    isNew: row.is_new === true,
    isOnePlusOne: row.is_one_plus_one === true,
    categoryId: row.category_id ? str(row.category_id) : category ? str(category.id) : null,
    categoryName: category ? str(category.name) : "전체",
    categorySlug: category ? str(category.slug) : "all",
    listPrice: num(priced.list_price),
    salePrice: num(priced.sale_price),
    stock: active.reduce((sum, variant) => sum + num(variant.stock), 0),
    image: resolveImage(image ? str(image.storage_path) : null),
    imageAlt: image ? str(image.alt, str(row.name)) : str(row.name),
    pointRateBps: num(row.point_rate_bps, 100),
    salesCount: num(row.sales_count),
    createdAt: str(row.created_at),
  };
}

function mapVariant(row: Record<string, unknown>): VariantChoice {
  return {
    id: str(row.id),
    sku: str(row.sku),
    optionName: str(row.option_name, "기본"),
    listPrice: num(row.list_price),
    salePrice: num(row.sale_price),
    stock: num(row.stock),
    safetyStock: num(row.safety_stock),
    active: row.is_active !== false,
  };
}

export async function loadPolicy(supabase: SupabaseClient): Promise<ShopPolicy> {
  const { data } = await supabase.from("shop_settings").select("key,value");
  const map = new Map<string, unknown>();
  for (const row of rows(data)) map.set(str(row.key), row.value);
  const read = (key: string, fallback: number) => {
    const value = map.get(key);
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    pointRateBps: read("point_rate_bps", DEFAULT_POLICY.pointRateBps),
    pointMinUse: read("point_min_use", DEFAULT_POLICY.pointMinUse),
    pointExpiryDays: read("point_expiry_days", DEFAULT_POLICY.pointExpiryDays),
    freeShippingThreshold: read("free_shipping_threshold", DEFAULT_POLICY.freeShippingThreshold),
    baseShippingFee: read("base_shipping_fee", DEFAULT_POLICY.baseShippingFee),
    maxCouponsPerOrder: read("max_coupons_per_order", DEFAULT_POLICY.maxCouponsPerOrder),
  };
}

export async function listCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("categories").select("id,slug,name,description,sort_order").order("sort_order");
  const categories: Category[] = rows(data).map((row) => ({
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    description: str(row.description),
  }));
  return { categories, error: messageOf(error) };
}

export async function listProducts(
  supabase: SupabaseClient,
  options: {
    categorySlug?: string;
    query?: string;
    sort?: string;
    best?: boolean;
    newest?: boolean;
    onePlus?: boolean;
    inStock?: boolean;
    ids?: string[];
    includeHidden?: boolean;
    limit?: number;
  } = {},
) {
  let request = supabase.from("products").select(PRODUCT_LIST);
  if (!options.includeHidden) request = request.in("status", ["on_sale", "sold_out"]);
  if (options.best) request = request.eq("is_best", true);
  if (options.onePlus) request = request.eq("is_one_plus_one", true);
  if (options.ids && options.ids.length > 0) request = request.in("id", options.ids);
  if (options.categorySlug && options.categorySlug !== "all") {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", options.categorySlug).maybeSingle();
    const categoryId = asRecord(category)?.id;
    if (!categoryId) return { products: [] as ProductCard[], error: null };
    request = request.eq("category_id", categoryId);
  }
  const safeQuery = options.query?.replace(/[%_,.()]/g, " ").trim();
  if (safeQuery) request = request.or(`name.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%`);
  if (options.newest) request = request.order("created_at", { ascending: false });
  else request = request.order("sales_count", { ascending: false });
  const { data, error } = await request.limit(options.limit ?? 80);
  let products = rows(data).map(mapCard).filter((item): item is ProductCard => Boolean(item));
  if (options.inStock) products = products.filter((item) => item.stock > 0 && item.status === "on_sale");
  if (options.sort === "price_asc") products = [...products].sort((a, b) => a.salePrice - b.salePrice);
  if (options.sort === "price_desc") products = [...products].sort((a, b) => b.salePrice - a.salePrice);
  if (options.sort === "new") products = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { products, error: messageOf(error) };
}

export async function getProduct(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase.from("products").select(PRODUCT_DETAIL).eq("slug", slug).maybeSingle();
  const row = asRecord(data);
  if (!row) return { product: null as ProductDetail | null, error: messageOf(error) };
  const card = mapCard(row);
  if (!card) return { product: null, error: messageOf(error) };
  const images = [...rows(row.product_images)]
    .sort((a, b) => num(a.sort_order) - num(b.sort_order))
    .map((image) => ({ src: resolveImage(str(image.storage_path)), alt: str(image.alt, card.name) }));
  const product: ProductDetail = {
    ...card,
    description: str(row.description),
    origin: str(row.origin),
    ingredients: str(row.ingredients),
    allergens: str(row.allergens),
    storageMethod: str(row.storage_method),
    shelfLifePolicy: str(row.shelf_life_policy),
    manufacturer: str(row.manufacturer),
    seller: str(row.seller),
    shippingNote: str(row.shipping_note),
    variants: rows(row.product_variants).map(mapVariant),
    images: images.length > 0 ? images : [{ src: card.image, alt: card.imageAlt }],
  };
  return { product, error: messageOf(error) };
}

export async function listReviews(supabase: SupabaseClient, productId?: string) {
  let request = supabase
    .from("reviews")
    .select("id,product_id,user_id,rating,content,display_name,is_seed,is_hidden,created_at,review_images(storage_path,alt),products(name)")
    .order("created_at", { ascending: false })
    .limit(40);
  if (productId) request = request.eq("product_id", productId);
  const { data, error } = await request;
  const reviews: ReviewItem[] = rows(data).map((row) => {
    const product = one(row.products);
    return {
      id: str(row.id),
      productId: str(row.product_id),
      productName: product ? str(product.name) : undefined,
      userId: row.user_id ? str(row.user_id) : null,
      rating: num(row.rating),
      content: str(row.content),
      displayName: str(row.display_name, "회원"),
      isSeed: row.is_seed === true,
      isHidden: row.is_hidden === true,
      createdAt: str(row.created_at),
      images: rows(row.review_images).map((image) => ({
        src: resolveImage(str(image.storage_path), "review-images"),
        alt: str(image.alt, "리뷰 이미지"),
      })),
    };
  });
  return { reviews, error: messageOf(error) };
}

export function mapCoupon(row: unknown): CouponPolicy | null {
  const record = asRecord(row);
  if (!record) return null;
  const coupon = one(record.coupons) ?? record;
  const status = str(record.status, "available");
  const allowed = ["available", "used", "expired", "restored"] as const;
  return {
    userCouponId: str(record.id || coupon.id),
    couponId: str(coupon.id),
    name: str(coupon.name),
    code: str(coupon.code),
    discountType: coupon.discount_type === "percent" ? "percent" : "fixed",
    discountValue: num(coupon.discount_value),
    minOrderAmount: num(coupon.min_order_amount),
    maxDiscountAmount: coupon.max_discount_amount == null ? null : num(coupon.max_discount_amount),
    categoryId: coupon.category_id ? str(coupon.category_id) : null,
    productId: coupon.product_id ? str(coupon.product_id) : null,
    startsAt: coupon.starts_at ? str(coupon.starts_at) : null,
    endsAt: coupon.ends_at ? str(coupon.ends_at) : null,
    status: allowed.includes(status as (typeof allowed)[number]) ? (status as CouponPolicy["status"]) : "used",
    isActive: coupon.is_active !== false,
  };
}

export async function listUserCoupons(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_coupons")
    .select("id,status,used_at,issued_at,coupons(id,code,name,discount_type,discount_value,min_order_amount,max_discount_amount,category_id,product_id,starts_at,ends_at,is_active)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  return {
    coupons: rows(data)
      .map((row) => ({ coupon: mapCoupon(row), usedAt: str(row.used_at), issuedAt: str(row.issued_at) }))
      .filter((row) => row.coupon),
    error: messageOf(error),
  };
}

export async function listClaimableCoupons(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("coupons")
    .select("id,code,name,discount_type,discount_value,min_order_amount,max_discount_amount,category_id,product_id,starts_at,ends_at,is_active")
    .eq("is_active", true);
  return { coupons: rows(data), error: messageOf(error) };
}

export async function getCart(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("carts")
    .select(`
      id,
      cart_items (
        id, quantity,
        product_variants (
          id, sku, option_name, list_price, sale_price, stock, is_active, product_id,
          products (
            id, slug, name, status, point_rate_bps, category_id,
            product_images ( storage_path, alt, sort_order ),
            product_variants ( id, option_name, stock, is_active )
          )
        )
      )
    `)
    .eq("user_id", userId)
    .maybeSingle();
  const cart = asRecord(data);
  const lines: CartLine[] = rows(cart?.cart_items)
    .map((item) => {
      const variant = one(item.product_variants);
      const product = one(variant?.products);
      if (!variant || !product) return null;
      const images = [...rows(product.product_images)].sort((a, b) => num(a.sort_order) - num(b.sort_order));
      const line: CartLine = {
        id: str(item.id),
        quantity: num(item.quantity, 1),
        variantId: str(variant.id),
        productId: str(product.id),
        slug: str(product.slug),
        name: str(product.name),
        optionName: str(variant.option_name, "기본"),
        sku: str(variant.sku),
        listPrice: num(variant.list_price),
        salePrice: num(variant.sale_price),
        stock: num(variant.stock),
        active: variant.is_active !== false,
        status: str(product.status, "on_sale"),
        image: resolveImage(images[0] ? str(images[0].storage_path) : null),
        categoryId: product.category_id ? str(product.category_id) : null,
        pointRateBps: num(product.point_rate_bps, 100),
        options: rows(product.product_variants).map((option) => ({
          id: str(option.id),
          optionName: str(option.option_name, "기본"),
          stock: num(option.stock),
          active: option.is_active !== false,
        })),
      };
      return line;
    })
    .filter((line): line is CartLine => Boolean(line));
  return { cartId: cart ? str(cart.id) : null, lines, error: messageOf(error) };
}

export async function listWishlist(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("wishlists")
    .select(`product_id, products (${PRODUCT_LIST})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const products = rows(data)
    .map((row) => {
      const product = one(row.products);
      return product ? mapCard(product) : null;
    })
    .filter((item): item is ProductCard => Boolean(item));
  const ids = new Set(rows(data).map((row) => str(row.product_id)));
  return { products, ids, error: messageOf(error) };
}

function mapOrder(row: Record<string, unknown>): OrderSummary {
  const snapshot = asRecord(row.coupon_snapshot);
  const shipment = one(row.shipments);
  return {
    id: str(row.id),
    orderNo: str(row.order_no),
    status: str(row.status),
    total: num(row.total),
    createdAt: str(row.created_at),
    recipient: str(row.recipient),
    phone: str(row.phone),
    postalCode: str(row.postal_code),
    address1: str(row.address1),
    address2: str(row.address2),
    memo: str(row.memo),
    adminMemo: str(row.admin_memo),
    listSubtotal: num(row.list_subtotal),
    saleSubtotal: num(row.sale_subtotal),
    productDiscount: num(row.product_discount),
    couponDiscount: num(row.coupon_discount),
    pointsUsed: num(row.points_used),
    shippingFee: num(row.shipping_fee),
    pointsEarned: num(row.points_earned),
    couponSnapshot: snapshot
      ? { code: str(snapshot.code), name: str(snapshot.name), discount: num(snapshot.discount) }
      : null,
    items: rows(row.order_items).map((item) => ({
      id: str(item.id),
      productId: item.product_id ? str(item.product_id) : null,
      productName: str(item.product_name),
      optionName: str(item.option_name),
      quantity: num(item.quantity),
      salePrice: num(item.sale_price),
      sku: str(item.sku),
    })),
    shipment: shipment
      ? { carrier: str(shipment.carrier), trackingNo: str(shipment.tracking_no), status: str(shipment.status) }
      : null,
  };
}

const ORDER_SELECT = `
  id, order_no, status, total, created_at, recipient, phone, postal_code, address1, address2, memo, admin_memo,
  list_subtotal, sale_subtotal, product_discount, coupon_discount, points_used, shipping_fee, points_earned, coupon_snapshot,
  order_items ( id, product_id, product_name, option_name, quantity, sale_price, sku ),
  shipments ( carrier, tracking_no, status )
`;

export async function listOrders(supabase: SupabaseClient, userId?: string) {
  let request = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(100);
  if (userId) request = request.eq("user_id", userId);
  const { data, error } = await request;
  return { orders: rows(data).map(mapOrder), error: messageOf(error) };
}

export async function getOrder(supabase: SupabaseClient, orderNo: string) {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("order_no", orderNo).maybeSingle();
  const row = asRecord(data);
  return { order: row ? mapOrder(row) : null, error: messageOf(error) };
}

export async function listAddresses(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false });
  const addresses: Address[] = rows(data).map((row) => ({
    id: str(row.id),
    label: str(row.label),
    recipient: str(row.recipient),
    phone: str(row.phone),
    postalCode: str(row.postal_code),
    address1: str(row.address1),
    address2: str(row.address2),
    isDefault: row.is_default === true,
  }));
  return { addresses, error: messageOf(error) };
}

export async function listPosts(supabase: SupabaseClient, boardSlug: string, productId?: string) {
  const { data: board } = await supabase.from("boards").select("id,name,description").eq("slug", boardSlug).maybeSingle();
  const boardRow = asRecord(board);
  if (!boardRow) return { posts: [] as PostItem[], error: null };
  let request = supabase
    .from("posts")
    .select("id,title,content,author_name,is_secret,is_pinned,created_at,product_id,user_id")
    .eq("board_id", str(boardRow.id))
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (productId) request = request.eq("product_id", productId);
  const { data, error } = await request;
  return {
    posts: rows(data).map(mapPost),
    error: messageOf(error),
  };
}

function mapPost(row: Record<string, unknown>): PostItem {
  return {
    id: str(row.id),
    title: str(row.title),
    content: str(row.content),
    authorName: str(row.author_name, "회원"),
    isSecret: row.is_secret === true,
    isPinned: row.is_pinned === true,
    createdAt: str(row.created_at),
    productId: row.product_id ? str(row.product_id) : null,
    userId: row.user_id ? str(row.user_id) : null,
  };
}

export async function getPost(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,content,author_name,is_secret,is_pinned,created_at,product_id,user_id,board_id")
    .eq("id", id)
    .maybeSingle();
  const row = asRecord(data);
  if (!row) return { post: null as PostItem | null, comments: [] as CommentItem[], error: messageOf(error) };
  const { data: commentRows } = await supabase
    .from("comments")
    .select("id,content,author_name,is_admin,created_at,user_id")
    .eq("post_id", id)
    .order("created_at");
  const comments: CommentItem[] = rows(commentRows).map((comment) => ({
    id: str(comment.id),
    content: str(comment.content),
    authorName: str(comment.author_name, comment.is_admin === true ? "잡사바" : "회원"),
    isAdmin: comment.is_admin === true,
    createdAt: str(comment.created_at),
    userId: comment.user_id ? str(comment.user_id) : null,
  }));
  return { post: mapPost(row), comments, error: messageOf(error) };
}

export async function listInquiries(supabase: SupabaseClient, userId?: string) {
  let request = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100);
  if (userId) request = request.eq("user_id", userId);
  const { data, error } = await request;
  return { inquiries: rows(data), error: messageOf(error) };
}

export async function listLedger(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("point_ledger")
    .select("id,type,amount,balance_after,expires_at,memo,created_at,order_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return { entries: rows(data), error: messageOf(error) };
}

export async function pointBalanceOf(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("compute_point_balance", { p_user: userId });
  return { balance: typeof data === "number" ? data : 0, error: messageOf(error) };
}

export async function homeContent(supabase: SupabaseClient) {
  const [categories, best, fresh, onePlus, reviews, banners, events, popup] = await Promise.all([
    listCategories(supabase),
    listProducts(supabase, { best: true, limit: 5 }),
    listProducts(supabase, { newest: true, limit: 5 }),
    listProducts(supabase, { onePlus: true, limit: 4 }),
    listReviews(supabase),
    supabase.from("banners").select("id,title,subtitle,link_url,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("events").select("id,slug,title,description").eq("is_active", true),
    supabase.from("popups").select("id,title,body,link_url").eq("is_active", true).limit(1).maybeSingle(),
  ]);
  const newest = fresh.products.filter((item) => item.isNew);
  return {
    categories: categories.categories,
    best: best.products,
    fresh: newest.length > 0 ? newest : fresh.products.slice(0, 4),
    onePlus: onePlus.products,
    reviews: reviews.reviews.slice(0, 4),
    banners: rows(banners.data),
    events: rows(events.data),
    popup: asRecord(popup.data),
    error: categories.error || best.error || banners.error?.message || null,
  };
}

export async function variantsForCheckout(supabase: SupabaseClient, variantIds: string[]) {
  if (variantIds.length === 0) return [];
  const { data } = await supabase
    .from("product_variants")
    .select("id,sku,option_name,list_price,sale_price,stock,is_active,product_id,products(id,name,category_id,status,point_rate_bps)")
    .in("id", variantIds);
  return rows(data);
}
