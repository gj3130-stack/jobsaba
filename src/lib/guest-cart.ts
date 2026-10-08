export type GuestCartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  optionName: string;
  sku: string;
  listPrice: number;
  salePrice: number;
  quantity: number;
  stock: number;
  image: string;
  categoryId: string | null;
  pointRateBps: number;
};

const KEY = "jobsaba.guestCart";

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.variantId === "string") as GuestCartItem[];
  } catch {
    return [];
  }
}

export function writeGuestCart(items: GuestCartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("jobsaba-cart"));
}

export function upsertGuestItem(item: GuestCartItem) {
  const items = readGuestCart();
  const index = items.findIndex((row) => row.variantId === item.variantId);
  if (index >= 0) {
    const next = items[index];
    next.quantity = Math.min(item.stock, next.quantity + item.quantity);
    items[index] = next;
  } else {
    items.push(item);
  }
  writeGuestCart(items);
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("jobsaba-cart"));
}
