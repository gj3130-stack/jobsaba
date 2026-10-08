import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CATALOG_CATEGORIES,
  CATALOG_PRODUCTS,
  SELLER_INFO,
  catalogProductBySlug,
  type CatalogProduct,
} from "@/lib/catalog-data";
import type { Category, ProductCard, ProductDetail, ProductExtra, ReviewItem, StorageType } from "@/lib/models";
import { DEFAULT_POLICY, type ShopPolicy } from "@/lib/pricing";
import { getProduct, homeContent, listCategories, listProducts, listReviews, loadPolicy } from "@/lib/queries";
import { SHIPPING_DEFAULTS, STORAGE_LABEL } from "@/lib/shipping";

/**
 * 스토어 화면용 데이터 진입점.
 * Supabase 클라이언트가 있으면 DB(lib/queries)를, 없으면 로컬 카탈로그(lib/catalog-data)를 읽는다.
 */

export type ProductQuery = {
  categorySlug?: string;
  query?: string;
  sort?: string;
  best?: boolean;
  newest?: boolean;
  onePlus?: boolean;
  inStock?: boolean;
  ids?: string[];
  tag?: string;
  limit?: number;
};

/** 키가 없을 때 쓰는 정책. 배송비는 PRD 7A 기본값(3,500원 / 30,000원 이상 무료). */
export const LOCAL_POLICY: ShopPolicy = {
  ...DEFAULT_POLICY,
  baseShippingFee: SHIPPING_DEFAULTS.baseShippingFee,
  freeShippingThreshold: SHIPPING_DEFAULTS.freeShippingThreshold,
};

function ratingOf(product: CatalogProduct) {
  if (product.reviews.length === 0) return { rating: 0, reviewCount: 0 };
  const sum = product.reviews.reduce((total, review) => total + review.rating, 0);
  return { rating: Math.round((sum / product.reviews.length) * 10) / 10, reviewCount: product.reviews.length };
}

function cheapest(product: CatalogProduct) {
  return [...product.variants].sort((a, b) => a.salePrice - b.salePrice)[0];
}

export function catalogCard(product: CatalogProduct): ProductCard {
  const category = CATALOG_CATEGORIES.find((item) => item.slug === product.categorySlug);
  const priced = cheapest(product);
  const image = product.images[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    summary: product.summary,
    status: product.variants.some((variant) => variant.stock > 0) ? "on_sale" : "sold_out",
    isBest: product.isBest,
    isNew: product.isNew,
    isOnePlusOne: product.isOnePlusOne,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? "전체",
    categorySlug: product.categorySlug,
    listPrice: priced.listPrice,
    salePrice: priced.salePrice,
    stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    image: image.src,
    imageAlt: image.alt,
    pointRateBps: 100,
    salesCount: product.salesCount,
    createdAt: product.createdAt,
    storageType: product.storage,
    tag: product.tag,
    ...ratingOf(product),
  };
}

function shippingNoteFor(storage: StorageType) {
  if (storage === "room") return "상온 상품은 택배 상자로 출고합니다.";
  return `${STORAGE_LABEL[storage]} 상품은 아이스박스와 아이스팩으로 포장해 출고합니다. 금·토·일과 공휴일에는 출고하지 않습니다.`;
}

export function buildNotice(input: {
  name: string;
  foodType: string;
  options: string[];
  ingredients: string;
  origin: string;
  allergens: string;
  shelfLife: string;
  storageMethod: string;
}): [string, string][] {
  return [
    ["제품명", input.name],
    ["식품의 유형", input.foodType],
    ["생산자 및 소재지", SELLER_INFO.manufacturer],
    ["제조연월일 · 소비기한", `제조연월일은 제품 라벨에 별도 표기 · 소비기한: ${input.shelfLife}`],
    ["포장단위별 내용물의 용량(중량) · 수량", input.options.join(" / ")],
    ["원재료명 및 함량", input.ingredients],
    ["원산지", input.origin],
    ["영양성분", "제품 라벨에 표기 (예시)"],
    ["유전자변형식품 해당 여부", "해당 없음"],
    ["소비자안전을 위한 주의사항", `${input.allergens.replace(/[.\s]+$/, "")}. ${input.storageMethod}`],
    ["수입식품 문구", "해당 없음 (수입 원료는 원산지에 표기)"],
    ["소비자상담 관련 전화번호", SELLER_INFO.phone],
  ];
}

function catalogExtra(product: CatalogProduct): ProductExtra {
  return {
    foodType: product.foodType,
    story: product.story,
    points: product.points,
    pairings: product.pairings,
    howTo: product.howTo,
    notice: buildNotice({
      name: product.name,
      foodType: product.foodType,
      options: product.variants.map((variant) => variant.optionName),
      ingredients: product.ingredients,
      origin: product.origin,
      allergens: product.allergens,
      shelfLife: product.shelfLife,
      storageMethod: product.storageMethod,
    }),
  };
}

function catalogDetail(product: CatalogProduct): ProductDetail {
  return {
    ...catalogCard(product),
    description: product.story,
    origin: product.origin,
    ingredients: product.ingredients,
    allergens: product.allergens,
    storageMethod: product.storageMethod,
    shelfLifePolicy: product.shelfLife,
    manufacturer: SELLER_INFO.manufacturer,
    seller: SELLER_INFO.seller,
    shippingNote: shippingNoteFor(product.storage),
    variants: product.variants.map((variant) => ({ ...variant, safetyStock: 5, active: true })),
    images: product.images,
    extra: catalogExtra(product),
  };
}

function catalogReviews(product: CatalogProduct): ReviewItem[] {
  return product.reviews.map((review) => ({
    id: review.id,
    productId: product.id,
    productName: product.name,
    userId: null,
    rating: review.rating,
    content: review.content,
    displayName: review.name,
    isSeed: true,
    isHidden: false,
    createdAt: `${review.date}T12:00:00+09:00`,
    images: [],
  }));
}

function sortCards(products: ProductCard[], sort?: string) {
  if (sort === "price_asc") return [...products].sort((a, b) => a.salePrice - b.salePrice);
  if (sort === "price_desc") return [...products].sort((a, b) => b.salePrice - a.salePrice);
  if (sort === "new") return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "review") return [...products].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  return [...products].sort((a, b) => b.salesCount - a.salesCount);
}

export function localProducts(options: ProductQuery = {}) {
  let list = CATALOG_PRODUCTS.map(catalogCard);
  if (options.categorySlug && options.categorySlug !== "all") list = list.filter((item) => item.categorySlug === options.categorySlug);
  if (options.tag) list = list.filter((item) => item.tag === options.tag);
  if (options.best) list = list.filter((item) => item.isBest);
  if (options.onePlus) list = list.filter((item) => item.isOnePlusOne);
  if (options.ids && options.ids.length > 0) list = list.filter((item) => options.ids?.includes(item.id));
  const q = options.query?.trim().toLowerCase();
  if (q) {
    list = list.filter((item) => {
      const source = CATALOG_PRODUCTS.find((product) => product.id === item.id);
      const haystack = [item.name, item.summary, item.categoryName, item.tag ?? "", source?.ingredients ?? "", source?.pairings.join(" ") ?? ""]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }
  if (options.inStock) list = list.filter((item) => item.stock > 0 && item.status === "on_sale");
  list = options.newest ? sortCards(list, "new") : sortCards(list, options.sort);
  return list.slice(0, options.limit ?? 80);
}

export function storeCategoriesLocal(): Category[] {
  return CATALOG_CATEGORIES.map(({ id, slug, name, description }) => ({ id, slug, name, description }));
}

/** DB에서 읽은 카드에 카탈로그 정보(세부 분류·별점)를 slug로 덧붙인다. */
function enrichCard(card: ProductCard): ProductCard {
  const source = catalogProductBySlug(card.slug);
  if (!source) return card;
  return { ...card, tag: card.tag ?? source.tag, storageType: card.storageType ?? source.storage, ...ratingOf(source) };
}

export async function storeCategories(supabase: SupabaseClient | null): Promise<Category[]> {
  if (!supabase) return storeCategoriesLocal();
  const loaded = await listCategories(supabase);
  return loaded.categories.length > 0 ? loaded.categories : storeCategoriesLocal();
}

export async function storeProducts(supabase: SupabaseClient | null, options: ProductQuery = {}) {
  if (!supabase) return { products: localProducts(options), error: null as string | null };
  const { tag, ...rest } = options;
  const result = await listProducts(supabase, rest);
  let products = result.products.map(enrichCard);
  if (tag) products = products.filter((item) => item.tag === tag);
  if (options.sort === "review") products = sortCards(products, "review");
  return { products, error: result.error };
}

export async function storeProduct(supabase: SupabaseClient | null, slug: string): Promise<ProductDetail | null> {
  if (!supabase) {
    const source = catalogProductBySlug(slug);
    return source ? catalogDetail(source) : null;
  }
  const { product } = await getProduct(supabase, slug);
  if (!product) return null;
  const source = catalogProductBySlug(slug);
  const card = enrichCard(product);
  const extra: ProductExtra = source
    ? catalogExtra(source)
    : {
        foodType: product.categoryName,
        story: product.description,
        points: [],
        pairings: [],
        howTo: "",
        notice: buildNotice({
          name: product.name,
          foodType: product.categoryName,
          options: product.variants.map((variant) => variant.optionName),
          ingredients: product.ingredients,
          origin: product.origin,
          allergens: product.allergens,
          shelfLife: product.shelfLifePolicy,
          storageMethod: product.storageMethod,
        }),
      };
  return { ...product, ...card, extra };
}

export async function storeReviews(supabase: SupabaseClient | null, product: { id: string; slug: string }) {
  if (!supabase) {
    const source = catalogProductBySlug(product.slug);
    return source ? catalogReviews(source) : [];
  }
  const { reviews } = await listReviews(supabase, product.id);
  return reviews;
}

export async function storePolicy(supabase: SupabaseClient | null): Promise<ShopPolicy> {
  return supabase ? loadPolicy(supabase) : LOCAL_POLICY;
}

export function localRecentReviews(limit = 6) {
  return CATALOG_PRODUCTS.flatMap((product) =>
    catalogReviews(product).map((review) => ({ ...review, slug: product.slug, image: product.images[0].src })),
  )
    .filter((review) => review.rating === 5 && review.content.length > 24)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export type HomeData = {
  categories: Category[];
  best: ProductCard[];
  fresh: ProductCard[];
  onePlus: ProductCard[];
  gifts: ProductCard[];
  reviews: (ReviewItem & { slug?: string; image?: string })[];
  counts: Record<string, number>;
  total: number;
  error: string | null;
};

export async function storeHome(supabase: SupabaseClient | null): Promise<HomeData> {
  if (!supabase) {
    const all = localProducts({ limit: 200 });
    const counts: Record<string, number> = {};
    for (const item of all) counts[item.categorySlug] = (counts[item.categorySlug] ?? 0) + 1;
    return {
      categories: storeCategoriesLocal(),
      best: localProducts({ best: true, limit: 8 }),
      fresh: localProducts({ newest: true, limit: 200 }).filter((item) => item.isNew).slice(0, 8),
      onePlus: localProducts({ onePlus: true, limit: 8 }),
      gifts: localProducts({ categorySlug: "gift", limit: 4 }),
      reviews: localRecentReviews(6),
      counts,
      total: all.length,
      error: null,
    };
  }
  const [home, all, gifts] = await Promise.all([
    homeContent(supabase),
    listProducts(supabase, { limit: 200 }),
    listProducts(supabase, { categorySlug: "gift", limit: 4 }),
  ]);
  const [best, fresh, onePlus] = await Promise.all([
    listProducts(supabase, { best: true, limit: 8 }),
    listProducts(supabase, { newest: true, limit: 40 }),
    listProducts(supabase, { onePlus: true, limit: 8 }),
  ]);
  const counts: Record<string, number> = {};
  for (const item of all.products) counts[item.categorySlug] = (counts[item.categorySlug] ?? 0) + 1;
  const newest = fresh.products.filter((item) => item.isNew);
  const bySlug = new Map(all.products.map((item) => [item.id, item]));
  return {
    categories: home.categories.length > 0 ? home.categories : storeCategoriesLocal(),
    best: best.products.map(enrichCard),
    fresh: (newest.length > 0 ? newest : fresh.products).slice(0, 8).map(enrichCard),
    onePlus: onePlus.products.map(enrichCard),
    gifts: gifts.products.map(enrichCard),
    reviews: home.reviews.map((review) => {
      const card = bySlug.get(review.productId);
      return { ...review, slug: card?.slug, image: card?.image };
    }),
    counts,
    total: all.products.length,
    error: home.error,
  };
}

export function tagsFor(categorySlug: string) {
  const tags = new Set<string>();
  for (const product of CATALOG_PRODUCTS) if (categorySlug === "all" || product.categorySlug === categorySlug) tags.add(product.tag);
  return [...tags];
}

export type StoreEvent = { slug: string; title: string; description: string; productIds: string[]; image?: string };

const LOCAL_EVENTS: { slug: string; title: string; description: string; image: string; pick: () => ProductCard[] }[] = [
  {
    slug: "one-plus-one",
    title: "1+1 찬장 기획전",
    description: "자주 꺼내 쓰는 양념과 젓갈을 두 개 묶음(1+1) 옵션으로 준비했습니다. 상세 페이지에서 ‘1+1’ 옵션을 골라 주세요.",
    image: "/images/products/manneung-yangnyeom.webp",
    pick: () => localProducts({ onePlus: true }),
  },
  {
    slug: "jangdok-week",
    title: "장독 위크",
    description: "보리고추장, 햇살 된장, 조선간장까지. 항아리에서 익힌 장으로 찬장을 채우는 일주일입니다.",
    image: "/images/products/bori-gochujang.webp",
    pick: () => [...localProducts({ categorySlug: "jang" }), ...localProducts({ categorySlug: "gift" }).filter((item) => item.slug === "jangdok-samjong-set")],
  },
  {
    slug: "aekjeot-week",
    title: "국물 맛 잡는 액젓 기획",
    description: "멸치·까나리 액젓과 참치액, 그리고 세 가지를 한 번에 담은 액젓 삼종 세트.",
    image: "/images/products/aekjeot-samjong-set-photo.webp",
    pick: () => [...localProducts({ tag: "액젓" }), ...localProducts({ categorySlug: "gift" }).filter((item) => item.slug === "aekjeot-samjong-set")],
  },
];

export async function storeEvents(supabase: SupabaseClient | null): Promise<StoreEvent[]> {
  if (!supabase) return LOCAL_EVENTS.map(({ slug, title, description, image, pick }) => ({ slug, title, description, image, productIds: pick().map((item) => item.id) }));
  const { data } = await supabase.from("events").select("slug,title,description,product_ids").eq("is_active", true);
  return (Array.isArray(data) ? data : []).map((row) => ({
    slug: String(row.slug),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    productIds: Array.isArray(row.product_ids) ? row.product_ids.map(String) : [],
  }));
}

export async function storeEvent(supabase: SupabaseClient | null, slug: string) {
  if (!supabase) {
    const found = LOCAL_EVENTS.find((item) => item.slug === slug);
    if (!found) return null;
    return { slug, title: found.title, description: found.description, image: found.image, products: found.pick() };
  }
  const { data } = await supabase.from("events").select("title,description,product_ids").eq("slug", slug).maybeSingle();
  if (!data || typeof data !== "object") return null;
  const ids = Array.isArray(data.product_ids) ? data.product_ids.map(String) : [];
  const { products } = ids.length ? await storeProducts(supabase, { ids }) : { products: [] as ProductCard[] };
  return { slug, title: String(data.title ?? ""), description: String(data.description ?? ""), image: undefined as string | undefined, products };
}
