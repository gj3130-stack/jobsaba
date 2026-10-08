import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfTodayKstIso } from "@/lib/format";
import { resolveImage } from "@/lib/images";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rows(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row)) : [];
}

function one(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function loadDashboard(supabase: SupabaseClient) {
  const since = startOfTodayKstIso();
  const [ordersRes, returnsRes, refundsRes, openRes, variantRes] = await Promise.all([
    supabase.from("orders").select("id,status,total,created_at").gte("created_at", since),
    supabase.from("returns").select("id,type,created_at").gte("created_at", since),
    supabase.from("refunds").select("id,amount,status,created_at").gte("created_at", since),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("product_variants").select("id,sku,option_name,stock,safety_stock,products(name)").order("stock", { ascending: true }).limit(40),
  ]);
  const orders = rows(ordersRes.data);
  const settled = orders.filter((order) => order.status !== "cancelled" && order.status !== "payment_pending");
  const lowStock = rows(variantRes.data)
    .filter((variant) => num(variant.stock) <= num(variant.safety_stock))
    .slice(0, 8)
    .map((variant) => ({
      id: str(variant.id),
      sku: str(variant.sku),
      optionName: str(variant.option_name),
      stock: num(variant.stock),
      safetyStock: num(variant.safety_stock),
      productName: str(one(variant.products)?.name, "상품"),
    }));
  return {
    orderCount: orders.length,
    sales: settled.reduce((sum, order) => sum + num(order.total), 0),
    cancels: rows(returnsRes.data).filter((item) => item.type === "cancel").length,
    refunds: rows(refundsRes.data).length,
    refundAmount: rows(refundsRes.data).reduce((sum, item) => sum + num(item.amount), 0),
    openInquiries: openRes.count ?? 0,
    lowStock,
    error: ordersRes.error?.message || returnsRes.error?.message || variantRes.error?.message || null,
  };
}

export async function listMembers(supabase: SupabaseClient, query: string) {
  let request = supabase.from("profiles").select("id,email,name,phone,role,status,created_at").order("created_at", { ascending: false }).limit(100);
  const safe = query.replace(/[%_,.()]/g, " ").trim();
  if (safe) request = request.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`);
  const { data, error } = await request;
  return {
    members: rows(data).map((row) => ({
      id: str(row.id),
      email: str(row.email),
      name: str(row.name),
      phone: str(row.phone),
      role: str(row.role, "customer"),
      status: str(row.status, "active"),
      createdAt: str(row.created_at),
    })),
    error: error?.message ?? null,
  };
}

export async function listAdminProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,status,categories(name),product_variants(sale_price,stock,is_active)")
    .order("created_at", { ascending: false })
    .limit(100);
  return {
    products: rows(data).map((row) => {
      const variants = rows(row.product_variants);
      const priced = [...variants].sort((a, b) => num(a.sale_price) - num(b.sale_price))[0];
      return {
        id: str(row.id),
        slug: str(row.slug),
        name: str(row.name),
        status: str(row.status),
        categoryName: str(one(row.categories)?.name, "미분류"),
        salePrice: priced ? num(priced.sale_price) : 0,
        stock: variants.reduce((sum, variant) => sum + num(variant.stock), 0),
      };
    }),
    error: error?.message ?? null,
  };
}

export async function getAdminProduct(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, category_id, slug, name, summary, description, origin, ingredients, allergens,
      storage_method, shelf_life_policy, manufacturer, seller, shipping_note, status,
      is_best, is_new, is_one_plus_one, point_rate_bps,
      product_variants ( id, sku, option_name, list_price, sale_price, stock, safety_stock, is_active ),
      product_images ( id, storage_path, alt, sort_order )
    `)
    .eq("id", id)
    .maybeSingle();
  const row = asRecord(data);
  if (!row) return { product: null, error: error?.message ?? "상품을 찾지 못했습니다." };
  return {
    product: {
      id: str(row.id),
      categoryId: str(row.category_id),
      slug: str(row.slug),
      name: str(row.name),
      summary: str(row.summary),
      description: str(row.description),
      origin: str(row.origin),
      ingredients: str(row.ingredients),
      allergens: str(row.allergens),
      storageMethod: str(row.storage_method),
      shelfLife: str(row.shelf_life_policy),
      manufacturer: str(row.manufacturer),
      seller: str(row.seller),
      shippingNote: str(row.shipping_note),
      status: str(row.status, "on_sale"),
      isBest: row.is_best === true,
      isNew: row.is_new === true,
      isOnePlusOne: row.is_one_plus_one === true,
      pointRateBps: num(row.point_rate_bps, 100),
      variants: rows(row.product_variants).map((variant) => ({
        id: str(variant.id),
        sku: str(variant.sku),
        optionName: str(variant.option_name, "기본"),
        listPrice: num(variant.list_price),
        salePrice: num(variant.sale_price),
        stock: num(variant.stock),
        safetyStock: num(variant.safety_stock),
        active: variant.is_active !== false,
      })),
      images: rows(row.product_images)
        .sort((a, b) => num(a.sort_order) - num(b.sort_order))
        .map((image) => ({
          id: str(image.id),
          path: str(image.storage_path),
          src: resolveImage(str(image.storage_path)),
          alt: str(image.alt, str(row.name)),
        })),
    },
    error: null,
  };
}

export async function listAdminOrders(supabase: SupabaseClient, status: string) {
  let request = supabase
    .from("orders")
    .select("id,order_no,status,total,recipient,created_at,profiles(name,email)")
    .order("created_at", { ascending: false })
    .limit(80);
  if (status) request = request.eq("status", status);
  const { data, error } = await request;
  return {
    orders: rows(data).map((row) => ({
      id: str(row.id),
      orderNo: str(row.order_no),
      status: str(row.status),
      total: num(row.total),
      recipient: str(row.recipient),
      createdAt: str(row.created_at),
      buyer: str(one(row.profiles)?.name) || str(one(row.profiles)?.email, "회원"),
    })),
    error: error?.message ?? null,
  };
}

export async function getAdminOrder(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_no, status, recipient, phone, postal_code, address1, address2, memo, admin_memo,
      list_subtotal, sale_subtotal, product_discount, coupon_discount, points_used, shipping_fee,
      total, points_earned, created_at, profiles(name,email),
      order_items ( id, product_name, option_name, sku, sale_price, quantity ),
      payments ( id, provider, method, status, amount, transaction_id, created_at ),
      shipments ( carrier, tracking_no, status ),
      returns ( id, type, status, reason, created_at )
    `)
    .eq("id", id)
    .maybeSingle();
  const row = asRecord(data);
  if (!row) return { order: null, error: error?.message ?? "주문을 찾지 못했습니다." };
  const shipment = one(row.shipments);
  return {
    order: {
      id: str(row.id),
      orderNo: str(row.order_no),
      status: str(row.status),
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
      total: num(row.total),
      pointsEarned: num(row.points_earned),
      createdAt: str(row.created_at),
      buyer: str(one(row.profiles)?.name) || str(one(row.profiles)?.email, "회원"),
      email: str(one(row.profiles)?.email),
      items: rows(row.order_items).map((item) => ({
        id: str(item.id),
        productName: str(item.product_name),
        optionName: str(item.option_name),
        sku: str(item.sku),
        salePrice: num(item.sale_price),
        quantity: num(item.quantity),
      })),
      payments: rows(row.payments).map((payment) => ({
        id: str(payment.id),
        provider: str(payment.provider),
        method: str(payment.method),
        status: str(payment.status),
        amount: num(payment.amount),
        transactionId: str(payment.transaction_id),
        createdAt: str(payment.created_at),
      })),
      carrier: str(shipment?.carrier),
      trackingNo: str(shipment?.tracking_no),
      shipmentStatus: str(shipment?.status),
      returns: rows(row.returns).map((item) => ({
        id: str(item.id),
        type: str(item.type),
        status: str(item.status),
        reason: str(item.reason),
        createdAt: str(item.created_at),
      })),
    },
    error: null,
  };
}

export async function listInventory(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,sku,option_name,stock,safety_stock,products(name)")
    .order("stock", { ascending: true })
    .limit(200);
  return {
    variants: rows(data).map((row) => ({
      id: str(row.id),
      sku: str(row.sku),
      optionName: str(row.option_name),
      stock: num(row.stock),
      safetyStock: num(row.safety_stock),
      productName: str(one(row.products)?.name, "상품"),
    })),
    error: error?.message ?? null,
  };
}

export async function listPurchaseOrders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id,po_no,status,supplier,memo,created_at,purchase_order_items(id,quantity,received_quantity,unit_cost,variant_id,product_variants(sku,option_name,products(name)))")
    .order("created_at", { ascending: false })
    .limit(40);
  return {
    orders: rows(data).map((row) => ({
      id: str(row.id),
      poNo: str(row.po_no),
      status: str(row.status),
      supplier: str(row.supplier),
      memo: str(row.memo),
      createdAt: str(row.created_at),
      items: rows(row.purchase_order_items).map((item) => {
        const variant = one(item.product_variants);
        return {
          id: str(item.id),
          quantity: num(item.quantity),
          received: num(item.received_quantity),
          unitCost: num(item.unit_cost),
          sku: str(variant?.sku),
          label: `${str(one(variant?.products)?.name, "상품")} ${str(variant?.option_name)}`.trim(),
        };
      }),
    })),
    error: error?.message ?? null,
  };
}

export async function listDelivery(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_no,status,recipient,shipments(carrier,tracking_no,status)")
    .in("status", ["paid", "preparing", "shipping"])
    .order("created_at", { ascending: false })
    .limit(80);
  return {
    orders: rows(data).map((row) => {
      const shipment = one(row.shipments);
      return {
        id: str(row.id),
        orderNo: str(row.order_no),
        status: str(row.status),
        recipient: str(row.recipient),
        carrier: str(shipment?.carrier),
        trackingNo: str(shipment?.tracking_no),
        shipmentStatus: str(shipment?.status),
      };
    }),
    error: error?.message ?? null,
  };
}

export async function listCs(supabase: SupabaseClient) {
  const [inquiries, returns, posts] = await Promise.all([
    supabase.from("inquiries").select("id,category,title,content,status,answer,created_at,profiles(name,email)").order("created_at", { ascending: false }).limit(30),
    supabase.from("returns").select("id,type,status,reason,admin_note,created_at,orders(order_no)").order("created_at", { ascending: false }).limit(30),
    supabase.from("posts").select("id,title,content,author_name,created_at,boards(name,slug)").eq("status", "published").order("created_at", { ascending: false }).limit(15),
  ]);
  return {
    inquiries: rows(inquiries.data).map((row) => ({
      id: str(row.id),
      category: str(row.category),
      title: str(row.title),
      content: str(row.content),
      status: str(row.status),
      answer: str(row.answer),
      createdAt: str(row.created_at),
      author: str(one(row.profiles)?.name) || str(one(row.profiles)?.email, "회원"),
    })),
    returns: rows(returns.data).map((row) => ({
      id: str(row.id),
      type: str(row.type),
      status: str(row.status),
      reason: str(row.reason),
      note: str(row.admin_note),
      createdAt: str(row.created_at),
      orderNo: str(one(row.orders)?.order_no),
    })),
    posts: rows(posts.data).map((row) => ({
      id: str(row.id),
      title: str(row.title),
      content: str(row.content),
      author: str(row.author_name, "회원"),
      createdAt: str(row.created_at),
      board: str(one(row.boards)?.name, "게시판"),
      slug: str(one(row.boards)?.slug),
    })),
    error: inquiries.error?.message || returns.error?.message || posts.error?.message || null,
  };
}

export async function listPromotions(supabase: SupabaseClient) {
  const [coupons, banners, categories] = await Promise.all([
    supabase.from("coupons").select("id,code,name,discount_type,discount_value,min_order_amount,is_active").order("created_at", { ascending: false }),
    supabase.from("banners").select("id,title,subtitle,link_url,is_active,sort_order").order("sort_order"),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  return {
    coupons: rows(coupons.data).map((row) => ({
      id: str(row.id),
      code: str(row.code),
      name: str(row.name),
      discountType: str(row.discount_type),
      discountValue: num(row.discount_value),
      minOrder: num(row.min_order_amount),
      active: row.is_active !== false,
    })),
    banners: rows(banners.data).map((row) => ({
      id: str(row.id),
      title: str(row.title),
      subtitle: str(row.subtitle),
      linkUrl: str(row.link_url),
      active: row.is_active !== false,
    })),
    categories: rows(categories.data).map((row) => ({ id: str(row.id), name: str(row.name) })),
    error: coupons.error?.message || banners.error?.message || null,
  };
}

export async function listAdminReviews(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id,rating,content,display_name,is_hidden,is_seed,created_at,products(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  return {
    reviews: rows(data).map((row) => ({
      id: str(row.id),
      rating: num(row.rating),
      content: str(row.content),
      displayName: str(row.display_name, "회원"),
      hidden: row.is_hidden === true,
      seed: row.is_seed === true,
      createdAt: str(row.created_at),
      productName: str(one(row.products)?.name, "상품"),
    })),
    error: error?.message ?? null,
  };
}

export async function listTaxDocuments(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tax_documents")
    .select("id,doc_type,status,provider,created_at,orders(order_no)")
    .order("created_at", { ascending: false })
    .limit(50);
  return {
    documents: rows(data).map((row) => ({
      id: str(row.id),
      docType: str(row.doc_type),
      status: str(row.status),
      provider: str(row.provider),
      createdAt: str(row.created_at),
      orderNo: str(one(row.orders)?.order_no),
    })),
    error: error?.message ?? null,
  };
}
