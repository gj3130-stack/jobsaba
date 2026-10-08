export type Profile = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  marketingAgreed: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  status: string;
  isBest: boolean;
  isNew: boolean;
  isOnePlusOne: boolean;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  listPrice: number;
  salePrice: number;
  stock: number;
  image: string;
  imageAlt: string;
  pointRateBps: number;
  salesCount: number;
  createdAt: string;
};

export type VariantChoice = {
  id: string;
  sku: string;
  optionName: string;
  listPrice: number;
  salePrice: number;
  stock: number;
  safetyStock: number;
  active: boolean;
};

export type ProductDetail = ProductCard & {
  description: string;
  origin: string;
  ingredients: string;
  allergens: string;
  storageMethod: string;
  shelfLifePolicy: string;
  manufacturer: string;
  seller: string;
  shippingNote: string;
  variants: VariantChoice[];
  images: { src: string; alt: string }[];
};

export type ReviewItem = {
  id: string;
  productId: string;
  productName?: string;
  userId: string | null;
  rating: number;
  content: string;
  displayName: string;
  isSeed: boolean;
  isHidden: boolean;
  createdAt: string;
  images: { src: string; alt: string }[];
};

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  optionName: string;
  sku: string;
  listPrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
  status: string;
  image: string;
  categoryId: string | null;
  pointRateBps: number;
  options: { id: string; optionName: string; stock: number; active: boolean }[];
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
};

export type OrderSummary = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  recipient: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
  memo: string;
  adminMemo: string;
  listSubtotal: number;
  saleSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  pointsUsed: number;
  shippingFee: number;
  pointsEarned: number;
  couponSnapshot: { code?: string; name?: string; discount?: number } | null;
  items: { id: string; productId: string | null; productName: string; optionName: string; quantity: number; salePrice: number; sku: string }[];
  shipment: { carrier: string; trackingNo: string; status: string } | null;
};

export type PostItem = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  isSecret: boolean;
  isPinned: boolean;
  createdAt: string;
  productId: string | null;
  userId: string | null;
};

export type CommentItem = {
  id: string;
  content: string;
  authorName: string;
  isAdmin: boolean;
  createdAt: string;
  userId: string | null;
};
