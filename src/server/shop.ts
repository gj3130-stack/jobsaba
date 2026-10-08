"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCourierService, getTaxDocumentService } from "@/lib/adapters";
import { field, intField } from "@/lib/form";
import { getPaymentService } from "@/lib/payment";
import { calculateOrder, type PricingItem } from "@/lib/pricing";
import { listAddresses, loadPolicy, mapCoupon, pointBalanceOf, variantsForCheckout } from "@/lib/queries";
import { getSession } from "@/lib/session";

function fail(message: string) {
  return { ok: false as const, message };
}

async function cartIdFor(userId: string) {
  const { supabase } = await getSession();
  if (!supabase) return { supabase: null, cartId: null as string | null, message: "Supabase 환경 변수를 설정해 주세요." };
  const { data } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (data && typeof data === "object" && "id" in data && typeof data.id === "string") {
    return { supabase, cartId: data.id, message: null };
  }
  const created = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
  if (created.error || !created.data) return { supabase, cartId: null, message: created.error?.message ?? "장바구니를 만들지 못했습니다." };
  return { supabase, cartId: String(created.data.id), message: null };
}

export async function addToCart(variantId: string, quantity: number) {
  const { user } = await getSession();
  if (!user) return fail("로그인 후 장바구니에 담을 수 있습니다.");
  const qty = Math.max(1, Math.floor(quantity));
  const cart = await cartIdFor(user.id);
  if (!cart.supabase || !cart.cartId) return fail(cart.message ?? "장바구니 오류");
  const existing = await cart.supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cart.cartId)
    .eq("variant_id", variantId)
    .maybeSingle();
  if (existing.data && typeof existing.data === "object" && "id" in existing.data) {
    const next = Number(existing.data.quantity) + qty;
    const { error } = await cart.supabase.from("cart_items").update({ quantity: next }).eq("id", existing.data.id);
    if (error) return fail(error.message);
  } else {
    const { error } = await cart.supabase.from("cart_items").insert({ cart_id: cart.cartId, variant_id: variantId, quantity: qty });
    if (error) return fail(error.message);
  }
  revalidatePath("/cart");
  return { ok: true as const };
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) return fail("로그인이 필요합니다.");
  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase.from("cart_items").update({ quantity: Math.floor(quantity) }).eq("id", itemId);
    if (error) return fail(error.message);
  }
  revalidatePath("/cart");
  return { ok: true as const };
}

export async function removeCartItem(itemId: string) {
  return updateCartQuantity(itemId, 0);
}

export async function changeCartVariant(itemId: string, variantId: string) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) return fail("로그인이 필요합니다.");
  const { error } = await supabase.from("cart_items").update({ variant_id: variantId }).eq("id", itemId);
  if (error) return fail(error.message);
  revalidatePath("/cart");
  return { ok: true as const };
}

export async function mergeGuestCart(items: { variantId: string; quantity: number }[]) {
  const { user } = await getSession();
  if (!user) return fail("로그인이 필요합니다.");
  for (const item of items) {
    if (!item.variantId || item.quantity <= 0) continue;
    await addToCart(item.variantId, item.quantity);
  }
  revalidatePath("/cart");
  return { ok: true as const };
}

export async function toggleWishlist(productId: string) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) return fail("로그인 후 찜할 수 있습니다.");
  const existing = await supabase.from("wishlists").select("id").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
  if (existing.data && typeof existing.data === "object" && "id" in existing.data) {
    const { error } = await supabase.from("wishlists").delete().eq("id", existing.data.id);
    if (error) return fail(error.message);
    revalidatePath("/my/wishlist");
    return { ok: true as const, wished: false };
  }
  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return fail(error.message);
  revalidatePath("/my/wishlist");
  return { ok: true as const, wished: true };
}

export async function placeOrder(input: {
  lines: { variantId: string; quantity: number }[];
  address: { recipient: string; phone: string; postalCode: string; address1: string; address2: string; memo: string };
  saveAddress: boolean;
  userCouponId: string | null;
  pointsToUse: number;
  method: string;
}) {
  const { supabase, user, profile } = await getSession();
  if (!supabase || !user) return fail("로그인이 필요합니다.");
  if (!profile || profile.status !== "active") return fail("주문할 수 없는 회원 상태입니다.");
  if (input.lines.length === 0) return fail("주문할 상품이 없습니다.");

  const variantRows = await variantsForCheckout(
    supabase,
    input.lines.map((line) => line.variantId),
  );
  const items: PricingItem[] = [];
  for (const line of input.lines) {
    const row = variantRows.find((variant) => String(variant.id) === line.variantId);
    if (!row) return fail("상품 옵션을 찾을 수 없습니다.");
    const productValue = row.products;
    const product = Array.isArray(productValue) ? productValue[0] : productValue;
    if (!product || typeof product !== "object") return fail("상품 정보를 찾을 수 없습니다.");
    const record = product as Record<string, unknown>;
    items.push({
      variantId: String(row.id),
      productId: String(record.id),
      categoryId: record.category_id ? String(record.category_id) : null,
      name: String(record.name ?? ""),
      optionName: String(row.option_name ?? "기본"),
      sku: String(row.sku ?? ""),
      listPrice: Number(row.list_price),
      salePrice: Number(row.sale_price),
      quantity: line.quantity,
      stock: Number(row.stock),
      productStatus: String(record.status ?? "stopped") as PricingItem["productStatus"],
      variantActive: row.is_active !== false,
      pointRateBps: Number(record.point_rate_bps ?? 100),
    });
  }

  let coupon = null;
  if (input.userCouponId) {
    const { data } = await supabase
      .from("user_coupons")
      .select("id,status,coupons(id,code,name,discount_type,discount_value,min_order_amount,max_discount_amount,category_id,product_id,starts_at,ends_at,is_active)")
      .eq("id", input.userCouponId)
      .eq("user_id", user.id)
      .maybeSingle();
    coupon = mapCoupon(data);
    if (!coupon) return fail("쿠폰을 찾을 수 없습니다.");
  }

  const policy = await loadPolicy(supabase);
  const balance = await pointBalanceOf(supabase, user.id);
  const quote = calculateOrder({
    items,
    coupon,
    pointsToUse: input.pointsToUse,
    pointBalance: balance.balance,
    policy,
  });
  if (!quote.ok) return fail(quote.errors.join(" "));

  let payment;
  try {
    payment = getPaymentService();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "결제 설정을 확인해 주세요.");
  }
  const intent = await payment.createPayment({
    method: input.method,
    amount: quote.total,
    orderName: items.length === 1 ? items[0].name : `${items[0].name} 외 ${items.length - 1}건`,
  });
  const confirmed = await payment.confirmPayment(intent);
  if (!confirmed.ok) {
    await supabase.rpc("log_failed_payment", {
      p_method: input.method,
      p_amount: quote.total,
      p_message: confirmed.message,
    });
    revalidatePath("/my/payments");
    return fail(confirmed.message);
  }

  const { data, error } = await supabase.rpc("commit_order", {
    p: {
      items: input.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
      address: {
        recipient: input.address.recipient,
        phone: input.address.phone,
        postal_code: input.address.postalCode,
        address1: input.address.address1,
        address2: input.address.address2,
        memo: input.address.memo,
      },
      user_coupon_id: input.userCouponId,
      points_to_use: input.pointsToUse,
      payment_method: input.method,
      payment_provider: "mock",
      transaction_id: confirmed.transactionId,
      expected_total: quote.total,
    },
  });
  if (error) {
    await payment.refundPayment(confirmed, quote.total);
    return fail(error.message);
  }

  const orderNo = data && typeof data === "object" && "order_no" in data ? String(data.order_no) : "";
  if (input.saveAddress) {
    const existing = await listAddresses(supabase, user.id);
    await supabase.from("addresses").insert({
      user_id: user.id,
      recipient: input.address.recipient,
      phone: input.address.phone,
      postal_code: input.address.postalCode,
      address1: input.address.address1,
      address2: input.address.address2,
      is_default: existing.addresses.length === 0,
    });
  }
  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (cart && typeof cart === "object" && "id" in cart) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id).in(
      "variant_id",
      input.lines.map((line) => line.variantId),
    );
  }
  revalidatePath("/cart");
  revalidatePath("/my/orders");
  revalidatePath("/my/points");
  revalidatePath("/my/coupons");
  return { ok: true as const, orderNo };
}

export async function cancelOrder(formData: FormData) {
  const { supabase, user } = await getSession();
  const orderNo = field(formData, "orderNo");
  if (!supabase || !user) redirect(`/login?next=/my/orders/${orderNo}`);
  const { error } = await supabase.rpc("request_order_cancel", {
    p_order_id: field(formData, "orderId"),
    p_reason: field(formData, "reason"),
  });
  if (error) redirect(`/my/orders/${orderNo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/orders");
  revalidatePath("/my/cancellations");
  redirect("/my/cancellations?notice=" + encodeURIComponent("주문을 취소하고 결제·포인트·쿠폰 복원 내역을 남겼습니다."));
}

export async function requestReturn(formData: FormData) {
  const { supabase, user } = await getSession();
  const orderNo = field(formData, "orderNo");
  if (!supabase || !user) redirect(`/login?next=/my/orders/${orderNo}`);
  const { error } = await supabase.rpc("request_return", {
    p_order_id: field(formData, "orderId"),
    p_reason: field(formData, "reason"),
  });
  if (error) redirect(`/my/orders/${orderNo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/returns");
  redirect("/my/returns?notice=" + encodeURIComponent("반품 요청을 접수했습니다."));
}

export async function confirmPurchase(formData: FormData) {
  const { supabase, user } = await getSession();
  const orderNo = field(formData, "orderNo");
  if (!supabase || !user) redirect("/login?next=/my/orders");
  const { error } = await supabase.rpc("confirm_purchase", { p_order_id: field(formData, "orderId") });
  if (error) redirect(`/my/orders/${orderNo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/orders");
  redirect(`/my/orders/${orderNo}?notice=` + encodeURIComponent("구매를 확정했습니다."));
}

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login?next=/my/profile");
  const { error } = await supabase
    .from("profiles")
    .update({
      name: field(formData, "name"),
      phone: field(formData, "phone"),
      marketing_agreed: formData.get("marketing") === "on",
    })
    .eq("id", user.id);
  if (error) redirect(`/my/profile?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/profile");
  redirect("/my/profile?notice=" + encodeURIComponent("회원 정보를 저장했습니다."));
}

export async function withdrawAccount() {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ status: "withdrawn" }).eq("id", user.id);
  if (error) redirect(`/my/profile?error=${encodeURIComponent(error.message)}`);
  await supabase.auth.signOut();
  redirect("/?notice=" + encodeURIComponent("탈퇴 상태로 전환했습니다. 주문 기록은 남아 있습니다."));
}

export async function saveAddress(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login?next=/my/profile");
  const existing = await listAddresses(supabase, user.id);
  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    label: field(formData, "label"),
    recipient: field(formData, "recipient"),
    phone: field(formData, "phone"),
    postal_code: field(formData, "postalCode"),
    address1: field(formData, "address1"),
    address2: field(formData, "address2"),
    is_default: existing.addresses.length === 0 || formData.get("isDefault") === "on",
  });
  if (error) redirect(`/my/profile?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/profile");
  redirect("/my/profile?notice=" + encodeURIComponent("배송지를 추가했습니다."));
}

export async function deleteAddress(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login?next=/my/profile");
  await supabase.from("addresses").delete().eq("id", field(formData, "id")).eq("user_id", user.id);
  revalidatePath("/my/profile");
  redirect("/my/profile");
}

export async function createInquiry(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login?next=/support/inquiry");
  const title = field(formData, "title");
  const content = field(formData, "content");
  if (!title || !content) redirect("/support/inquiry?error=" + encodeURIComponent("제목과 내용을 입력해 주세요."));
  const { error } = await supabase.from("inquiries").insert({
    user_id: user.id,
    category: field(formData, "category") || "일반",
    title,
    content,
  });
  if (error) redirect(`/support/inquiry?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/inquiries");
  redirect("/my/inquiries?notice=" + encodeURIComponent("문의가 접수되었습니다."));
}

export async function createPost(formData: FormData) {
  const { supabase, user, profile } = await getSession();
  const back = field(formData, "back") || "/community/free";
  if (!supabase || !user) redirect(`/login?next=${back}`);
  const title = field(formData, "title");
  const content = field(formData, "content");
  const boardSlug = field(formData, "board");
  if (!title || !content) redirect(`${back}?error=` + encodeURIComponent("제목과 내용을 입력해 주세요."));
  const { data: board } = await supabase.from("boards").select("id").eq("slug", boardSlug).maybeSingle();
  if (!board || typeof board !== "object" || !("id" in board)) redirect(`${back}?error=` + encodeURIComponent("게시판을 찾을 수 없습니다."));
  const { error } = await supabase.from("posts").insert({
    board_id: board.id,
    user_id: user.id,
    author_name: profile?.name || "회원",
    title,
    content,
    is_secret: formData.get("secret") === "on",
    is_pinned: false,
    product_id: field(formData, "productId") || null,
    status: "published",
  });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(back);
  redirect(back);
}

export async function createComment(formData: FormData) {
  const { supabase, user, profile } = await getSession();
  const postId = field(formData, "postId");
  const back = field(formData, "back");
  if (!supabase || !user) redirect(`/login?next=${back}`);
  const content = field(formData, "content");
  if (!content) redirect(`${back}?error=` + encodeURIComponent("댓글을 입력해 주세요."));
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    author_name: profile?.role === "admin" ? "잡사바" : profile?.name || "회원",
    content,
    is_admin: profile?.role === "admin",
  });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(back);
  redirect(back);
}

export async function createReview(formData: FormData) {
  const { supabase, user, profile } = await getSession();
  const slug = field(formData, "slug");
  if (!supabase || !user) redirect(`/login?next=/products/${slug}`);
  const rating = intField(formData, "rating");
  const content = field(formData, "content");
  const productId = field(formData, "productId");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || content.length < 2) {
    redirect(`/products/${slug}?error=` + encodeURIComponent("별점과 리뷰 내용을 입력해 주세요."));
  }
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: productId,
      user_id: user.id,
      rating,
      content,
      display_name: profile?.name || "회원",
      is_seed: false,
      is_hidden: false,
    })
    .select("id")
    .single();
  if (error) redirect(`/products/${slug}?error=${encodeURIComponent(error.message)}`);
  const imagePath = field(formData, "imagePath");
  if (imagePath && data && typeof data === "object" && "id" in data) {
    await supabase.from("review_images").insert({ review_id: data.id, storage_path: imagePath, alt: "구매 리뷰 이미지" });
  }
  revalidatePath(`/products/${slug}`);
  redirect(`/products/${slug}?notice=` + encodeURIComponent("리뷰를 등록했습니다."));
}

export async function deleteReview(formData: FormData) {
  const { supabase, user } = await getSession();
  const slug = field(formData, "slug");
  if (!supabase || !user) redirect("/login");
  await supabase.from("reviews").delete().eq("id", field(formData, "reviewId")).eq("user_id", user.id);
  revalidatePath(`/products/${slug}`);
  redirect(`/products/${slug}`);
}

export async function claimCoupon(formData: FormData) {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect("/login?next=/my/coupons");
  const { error } = await supabase.rpc("claim_coupon", { p_code: field(formData, "code") });
  if (error) redirect(`/my/coupons?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/coupons");
  redirect("/my/coupons?notice=" + encodeURIComponent("쿠폰을 발급했습니다."));
}

export async function findLoginId(formData: FormData) {
  const { supabase } = await getSession();
  if (!supabase) return fail("Supabase 환경 변수를 설정해 주세요.");
  const { data, error } = await supabase.rpc("find_login_id", {
    p_name: field(formData, "name"),
    p_phone: field(formData, "phone"),
  });
  if (error) return fail(error.message);
  if (!data) return fail("일치하는 아이디를 찾지 못했습니다.");
  return { ok: true as const, masked: String(data) };
}

export async function logout() {
  const { supabase } = await getSession();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function requestTaxDocument(formData: FormData) {
  const { supabase, user } = await getSession();
  const orderNo = field(formData, "orderNo");
  if (!supabase || !user) redirect(`/login?next=/my/orders/${orderNo}`);
  const docType = field(formData, "docType") === "tax_invoice" ? "tax_invoice" : "cash_receipt";
  let requested;
  try {
    requested = await getTaxDocumentService().request({
      orderNo,
      docType,
      payload: {
        identity: field(formData, "identity"),
        email: field(formData, "email"),
      },
    });
  } catch (error) {
    redirect(`/my/orders/${orderNo}?error=${encodeURIComponent(error instanceof Error ? error.message : "문서 요청 실패")}`);
  }
  const { error } = await supabase.from("tax_documents").insert({
    order_id: field(formData, "orderId"),
    user_id: user.id,
    doc_type: docType,
    status: "requested",
    provider: "mock",
    provider_ref: requested.providerRef,
    payload: { identity: field(formData, "identity"), email: field(formData, "email") },
  });
  if (error) redirect(`/my/orders/${orderNo}?error=${encodeURIComponent(error.message)}`);
  redirect(`/my/orders/${orderNo}?notice=` + encodeURIComponent("세금문서 요청을 접수했습니다. 발급은 모의 상태입니다."));
}

export async function trackShipment(carrier: string, trackingNo: string) {
  try {
    return { ok: true as const, ...(await getCourierService().track({ carrier, trackingNo })) };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "배송 조회에 실패했습니다.");
  }
}
