"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCourierService } from "@/lib/adapters";
import { field, intField } from "@/lib/form";
import { requireAdmin } from "@/lib/session";

function back(path: string, error: string) {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

async function gate(nextPath: string) {
  const session = await requireAdmin();
  if (!session.supabase) redirect("/login?next=" + nextPath);
  if (!session.user) redirect("/login?next=" + nextPath);
  if (!session.allowed) redirect("/admin?error=" + encodeURIComponent("관리자 권한이 필요합니다."));
  return session;
}

export async function createProduct(formData: FormData) {
  const { supabase, user } = await gate("/admin/products/new");
  const slug = field(formData, "slug");
  const listPrice = intField(formData, "listPrice");
  const salePrice = intField(formData, "salePrice");
  const stock = intField(formData, "stock");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) back("/admin/products/new", "슬러그는 영문 소문자와 숫자, 하이픈만 사용할 수 있습니다.");
  if (!field(formData, "name") || !field(formData, "sku")) back("/admin/products/new", "상품명과 SKU를 입력해 주세요.");
  if (![listPrice, salePrice, stock].every((value) => Number.isInteger(value) && value >= 0) || salePrice > listPrice) {
    back("/admin/products/new", "가격과 재고는 0 이상의 정수이고, 판매가는 정상가보다 클 수 없습니다.");
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      category_id: field(formData, "categoryId") || null,
      slug,
      name: field(formData, "name"),
      summary: field(formData, "summary"),
      description: field(formData, "description"),
      origin: field(formData, "origin"),
      ingredients: field(formData, "ingredients"),
      allergens: field(formData, "allergens"),
      storage_method: field(formData, "storageMethod"),
      shelf_life_policy: field(formData, "shelfLife"),
      manufacturer: field(formData, "manufacturer") || "잡사바 식품",
      seller: field(formData, "seller") || "잡사바",
      shipping_note: field(formData, "shippingNote"),
      status: field(formData, "status") || "on_sale",
      is_best: formData.get("isBest") === "on",
      is_new: formData.get("isNew") === "on",
      is_one_plus_one: formData.get("isOnePlus") === "on",
      point_rate_bps: intField(formData, "pointRate") || 100,
    })
    .select("id")
    .single();
  if (error || !data) back("/admin/products/new", error?.message ?? "상품을 저장하지 못했습니다.");
  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: data.id,
    sku: field(formData, "sku"),
    option_name: field(formData, "optionName") || "기본",
    list_price: listPrice,
    sale_price: salePrice,
    stock,
    safety_stock: intField(formData, "safetyStock") || 5,
  });
  if (variantError) back(`/admin/products/${data.id}`, variantError.message);
  await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: "product.create",
    entity: "products",
    entity_id: data.id,
    detail: { slug },
  });
  revalidatePath("/");
  redirect(`/admin/products/${data.id}`);
}

export async function updateProduct(formData: FormData) {
  const id = field(formData, "id");
  const { supabase, user } = await gate(`/admin/products/${id}`);
  const { error } = await supabase
    .from("products")
    .update({
      category_id: field(formData, "categoryId") || null,
      name: field(formData, "name"),
      summary: field(formData, "summary"),
      description: field(formData, "description"),
      origin: field(formData, "origin"),
      ingredients: field(formData, "ingredients"),
      allergens: field(formData, "allergens"),
      storage_method: field(formData, "storageMethod"),
      shelf_life_policy: field(formData, "shelfLife"),
      manufacturer: field(formData, "manufacturer"),
      seller: field(formData, "seller"),
      shipping_note: field(formData, "shippingNote"),
      status: field(formData, "status") || "on_sale",
      is_best: formData.get("isBest") === "on",
      is_new: formData.get("isNew") === "on",
      is_one_plus_one: formData.get("isOnePlus") === "on",
      point_rate_bps: intField(formData, "pointRate") || 100,
    })
    .eq("id", id);
  if (error) back(`/admin/products/${id}`, error.message);
  await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: "product.update",
    entity: "products",
    entity_id: id,
  });
  revalidatePath("/");
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}?notice=` + encodeURIComponent("상품 정보를 저장했습니다."));
}

export async function addVariant(formData: FormData) {
  const productId = field(formData, "productId");
  const { supabase } = await gate(`/admin/products/${productId}`);
  const listPrice = intField(formData, "listPrice");
  const salePrice = intField(formData, "salePrice");
  const stock = intField(formData, "stock");
  if (![listPrice, salePrice, stock].every((value) => Number.isInteger(value) && value >= 0)) {
    back(`/admin/products/${productId}`, "옵션 가격과 재고를 확인해 주세요.");
  }
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    sku: field(formData, "sku"),
    option_name: field(formData, "optionName") || "기본",
    list_price: listPrice,
    sale_price: salePrice,
    stock,
    safety_stock: intField(formData, "safetyStock") || 5,
  });
  if (error) back(`/admin/products/${productId}`, error.message);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?notice=` + encodeURIComponent("옵션을 추가했습니다."));
}

export async function updateVariant(formData: FormData) {
  const productId = field(formData, "productId");
  const { supabase, user } = await gate(`/admin/products/${productId}`);
  const variantId = field(formData, "variantId");
  const stock = intField(formData, "stock");
  const { data: before } = await supabase.from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  const previous = before && typeof before === "object" && "stock" in before ? Number(before.stock) : stock;
  const { error } = await supabase
    .from("product_variants")
    .update({
      option_name: field(formData, "optionName"),
      list_price: intField(formData, "listPrice"),
      sale_price: intField(formData, "salePrice"),
      stock,
      safety_stock: intField(formData, "safetyStock"),
      is_active: formData.get("active") === "on",
    })
    .eq("id", variantId);
  if (error) back(`/admin/products/${productId}`, error.message);
  if (previous !== stock) {
    await supabase.from("inventory_movements").insert({
      variant_id: variantId,
      type: "adjust",
      quantity: stock - previous,
      reason: "관리자 재고 수정",
      created_by: user.id,
    });
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
  redirect(`/admin/products/${productId}?notice=` + encodeURIComponent("옵션을 저장했습니다."));
}

export async function adjustStock(formData: FormData) {
  const { supabase, user } = await gate("/admin/inventory");
  const variantId = field(formData, "variantId");
  const delta = intField(formData, "delta");
  if (!Number.isInteger(delta) || delta === 0) back("/admin/inventory", "변경 수량을 입력해 주세요.");
  const { data } = await supabase.from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  const current = data && typeof data === "object" && "stock" in data ? Number(data.stock) : 0;
  const next = current + delta;
  if (next < 0) back("/admin/inventory", "재고는 0보다 작아질 수 없습니다.");
  const { error } = await supabase.from("product_variants").update({ stock: next }).eq("id", variantId);
  if (error) back("/admin/inventory", error.message);
  await supabase.from("inventory_movements").insert({
    variant_id: variantId,
    type: delta > 0 ? "in" : "out",
    quantity: delta,
    reason: field(formData, "reason") || "재고 조정",
    created_by: user.id,
  });
  revalidatePath("/admin/inventory");
  redirect("/admin/inventory?notice=" + encodeURIComponent("재고를 변경했습니다."));
}

export async function addProductImage(productId: string, storagePath: string, alt: string) {
  const { supabase } = await gate(`/admin/products/${productId}`);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt,
    sort_order: 0,
  });
  if (error) return { ok: false as const, message: error.message };
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true as const };
}

export async function deleteProductImage(formData: FormData) {
  const productId = field(formData, "productId");
  const { supabase } = await gate(`/admin/products/${productId}`);
  const path = field(formData, "path");
  await supabase.from("product_images").delete().eq("id", field(formData, "imageId"));
  if (path && !path.startsWith("/") && !path.startsWith("http")) {
    await supabase.storage.from("product-images").remove([path]);
  }
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}`);
}

export async function setMember(formData: FormData) {
  const { supabase, user } = await gate("/admin/members");
  const memberId = field(formData, "memberId");
  const role = field(formData, "role") === "admin" ? "admin" : "customer";
  const status = field(formData, "status");
  if (!["active", "suspended", "withdrawn"].includes(status)) back("/admin/members", "회원 상태를 확인해 주세요.");
  const { error } = await supabase.from("profiles").update({ role, status }).eq("id", memberId);
  if (error) back("/admin/members", error.message);
  await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action: "member.update",
    entity: "profiles",
    entity_id: memberId,
    detail: { role, status },
  });
  revalidatePath("/admin/members");
  redirect("/admin/members?notice=" + encodeURIComponent("회원 정보를 저장했습니다."));
}

export async function setOrderStatus(formData: FormData) {
  const orderId = field(formData, "orderId");
  const { supabase } = await gate(`/admin/orders/${orderId}`);
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: field(formData, "status"),
    p_carrier: field(formData, "carrier"),
    p_tracking: field(formData, "tracking"),
    p_memo: field(formData, "memo"),
  });
  if (error) back(`/admin/orders/${orderId}`, error.message);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/delivery");
  redirect(`/admin/orders/${orderId}?notice=` + encodeURIComponent("주문 상태를 변경했습니다."));
}

export async function issueMockTracking(formData: FormData) {
  const orderId = field(formData, "orderId");
  const { supabase } = await gate("/admin/delivery");
  const orderNo = field(formData, "orderNo");
  const carrier = field(formData, "carrier") || "CJ대한통운";
  const registered = await getCourierService().registerShipment({ orderNo, carrier });
  const { error } = await supabase
    .from("shipments")
    .update({ carrier, tracking_no: registered.trackingNo, status: "shipped", shipped_at: new Date().toISOString() })
    .eq("order_id", orderId);
  if (error) back("/admin/delivery", error.message);
  await supabase.from("orders").update({ status: "shipping" }).eq("id", orderId);
  revalidatePath("/admin/delivery");
  redirect("/admin/delivery?notice=" + encodeURIComponent(`모의 송장 ${registered.trackingNo}을 등록했습니다.`));
}

export async function replyPost(formData: FormData) {
  const { supabase, user } = await gate("/admin/cs");
  const content = field(formData, "content");
  if (content.length < 1) back("/admin/cs", "답글 내용을 입력해 주세요.");
  const { error } = await supabase.from("comments").insert({
    post_id: field(formData, "postId"),
    user_id: user.id,
    author_name: "잡사바",
    content,
    is_admin: true,
  });
  if (error) back("/admin/cs", error.message);
  revalidatePath("/community");
  redirect("/admin/cs?notice=" + encodeURIComponent("답글을 남겼습니다."));
}

export async function answerInquiry(formData: FormData) {
  const { supabase } = await gate("/admin/cs");
  const { error } = await supabase
    .from("inquiries")
    .update({ answer: field(formData, "answer"), status: "answered", answered_at: new Date().toISOString() })
    .eq("id", field(formData, "inquiryId"));
  if (error) back("/admin/cs", error.message);
  revalidatePath("/admin/cs");
  redirect("/admin/cs?notice=" + encodeURIComponent("답변을 저장했습니다."));
}

export async function resolveReturn(formData: FormData) {
  const { supabase } = await gate("/admin/cs");
  const { error } = await supabase.rpc("admin_resolve_return", {
    p_return_id: field(formData, "returnId"),
    p_status: field(formData, "status"),
    p_note: field(formData, "note"),
  });
  if (error) back("/admin/cs", error.message);
  revalidatePath("/admin/cs");
  redirect("/admin/cs?notice=" + encodeURIComponent("반품 상태를 변경했습니다."));
}

export async function saveCoupon(formData: FormData) {
  const { supabase } = await gate("/admin/promotions");
  const { error } = await supabase.from("coupons").insert({
    code: field(formData, "code").toUpperCase(),
    name: field(formData, "name"),
    discount_type: field(formData, "discountType") === "percent" ? "percent" : "fixed",
    discount_value: intField(formData, "discountValue"),
    min_order_amount: intField(formData, "minOrder") || 0,
    max_discount_amount: field(formData, "maxDiscount") ? intField(formData, "maxDiscount") : null,
    category_id: field(formData, "categoryId") || null,
    starts_at: field(formData, "startsAt") || null,
    ends_at: field(formData, "endsAt") || null,
    is_active: true,
  });
  if (error) back("/admin/promotions", error.message);
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions?notice=" + encodeURIComponent("쿠폰을 등록했습니다."));
}

export async function issueCoupon(formData: FormData) {
  const { supabase } = await gate("/admin/promotions");
  const { error } = await supabase.rpc("admin_issue_coupon", {
    p_email: field(formData, "email"),
    p_code: field(formData, "code"),
  });
  if (error) back("/admin/promotions", error.message);
  redirect("/admin/promotions?notice=" + encodeURIComponent("쿠폰을 발급했습니다."));
}

export async function saveBanner(formData: FormData) {
  const { supabase } = await gate("/admin/promotions");
  const { error } = await supabase.from("banners").insert({
    title: field(formData, "title"),
    subtitle: field(formData, "subtitle"),
    link_url: field(formData, "linkUrl"),
    sort_order: intField(formData, "sortOrder") || 0,
    is_active: true,
  });
  if (error) back("/admin/promotions", error.message);
  revalidatePath("/");
  redirect("/admin/promotions?notice=" + encodeURIComponent("배너를 추가했습니다."));
}

export async function toggleHiddenReview(formData: FormData) {
  const { supabase } = await gate("/admin/reviews");
  const { error } = await supabase.from("reviews").update({ is_hidden: formData.get("hidden") === "true" }).eq("id", field(formData, "reviewId"));
  if (error) back("/admin/reviews", error.message);
  redirect("/admin/reviews?notice=" + encodeURIComponent("리뷰 노출을 변경했습니다."));
}

export async function setTaxStatus(formData: FormData) {
  const { supabase } = await gate("/admin/documents");
  const status = field(formData, "status");
  if (!["requested", "issued", "rejected"].includes(status)) back("/admin/documents", "문서 상태를 확인해 주세요.");
  const { error } = await supabase.from("tax_documents").update({ status }).eq("id", field(formData, "id"));
  if (error) back("/admin/documents", error.message);
  redirect("/admin/documents?notice=" + encodeURIComponent("문서 상태를 변경했습니다."));
}

export async function receivePurchaseOrder(formData: FormData) {
  const { supabase, user } = await gate("/admin/purchase-orders");
  const itemId = field(formData, "itemId");
  const add = intField(formData, "quantity");
  if (!Number.isInteger(add) || add <= 0) back("/admin/purchase-orders", "입고 수량을 확인해 주세요.");
  const { data } = await supabase
    .from("purchase_order_items")
    .select("id,variant_id,quantity,received_quantity,purchase_order_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!data || typeof data !== "object") back("/admin/purchase-orders", "발주 항목을 찾지 못했습니다.");
  const received = Number(data.received_quantity) + add;
  if (received > Number(data.quantity)) back("/admin/purchase-orders", "발주 수량을 초과할 수 없습니다.");
  await supabase.from("purchase_order_items").update({ received_quantity: received }).eq("id", itemId);
  const { data: variant } = await supabase.from("product_variants").select("stock").eq("id", data.variant_id).maybeSingle();
  const stock = variant && typeof variant === "object" && "stock" in variant ? Number(variant.stock) : 0;
  await supabase.from("product_variants").update({ stock: stock + add }).eq("id", data.variant_id);
  await supabase.from("inventory_movements").insert({
    variant_id: data.variant_id,
    type: "in",
    quantity: add,
    reason: "발주 입고",
    ref_type: "purchase_order",
    ref_id: data.purchase_order_id,
    created_by: user.id,
  });
  const { data: siblings } = await supabase
    .from("purchase_order_items")
    .select("quantity,received_quantity")
    .eq("purchase_order_id", data.purchase_order_id);
  const list = Array.isArray(siblings) ? siblings : [];
  const allReceived = list.every((row) => Number(row.received_quantity) >= Number(row.quantity));
  const anyReceived = list.some((row) => Number(row.received_quantity) > 0);
  await supabase
    .from("purchase_orders")
    .update({ status: allReceived ? "received" : anyReceived ? "partial" : "ordered" })
    .eq("id", data.purchase_order_id);
  revalidatePath("/admin/inventory");
  redirect("/admin/purchase-orders?notice=" + encodeURIComponent("입고 수량을 반영했습니다."));
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase } = await gate("/admin/purchase-orders");
  const poNo = field(formData, "poNo");
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({ po_no: poNo, supplier: field(formData, "supplier"), memo: field(formData, "memo"), status: "ordered" })
    .select("id")
    .single();
  if (error || !data) back("/admin/purchase-orders", error?.message ?? "발주를 만들지 못했습니다.");
  const { error: itemError } = await supabase.from("purchase_order_items").insert({
    purchase_order_id: data.id,
    variant_id: field(formData, "variantId"),
    quantity: intField(formData, "quantity"),
    unit_cost: intField(formData, "unitCost") || null,
  });
  if (itemError) back("/admin/purchase-orders", itemError.message);
  redirect("/admin/purchase-orders?notice=" + encodeURIComponent("발주를 등록했습니다."));
}
