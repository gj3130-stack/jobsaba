-- JOBSABA FOOD schema (PRD section 8)
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'withdrawn')),
  marketing_agreed boolean not null default false,
  terms_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  recipient text not null,
  phone text not null,
  postal_code text not null,
  address1 text not null,
  address2 text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  slug text not null unique,
  name text not null,
  summary text,
  description text,
  origin text,
  ingredients text,
  allergens text,
  storage_method text,
  shelf_life_policy text,
  manufacturer text,
  seller text,
  shipping_note text,
  status text not null default 'on_sale' check (status in ('on_sale', 'sold_out', 'hidden', 'stopped')),
  is_best boolean not null default false,
  is_new boolean not null default false,
  is_one_plus_one boolean not null default false,
  point_rate_bps integer not null default 100 check (point_rate_bps >= 0),
  sales_count integer not null default 0 check (sales_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  option_name text not null default '기본',
  list_price integer not null check (list_price >= 0),
  sale_price integer not null check (sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  safety_stock integer not null default 5 check (safety_stock >= 0),
  is_active boolean not null default true
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order integer not null default 0
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  guest_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner check (user_id is not null or guest_token is not null)
);

create unique index carts_one_per_user on public.carts (user_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (cart_id, variant_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references public.profiles (id),
  status text not null default 'payment_pending' check (
    status in ('payment_pending', 'paid', 'preparing', 'shipping', 'delivered', 'confirmed', 'cancelled')
  ),
  recipient text not null,
  phone text not null,
  postal_code text not null,
  address1 text not null,
  address2 text,
  memo text,
  admin_memo text,
  list_subtotal integer not null default 0 check (list_subtotal >= 0),
  sale_subtotal integer not null default 0 check (sale_subtotal >= 0),
  product_discount integer not null default 0 check (product_discount >= 0),
  coupon_discount integer not null default 0 check (coupon_discount >= 0),
  points_used integer not null default 0 check (points_used >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  total integer not null check (total >= 0),
  points_earned integer not null default 0 check (points_earned >= 0),
  user_coupon_id uuid,
  coupon_snapshot jsonb,
  benefits_restored boolean not null default false,
  stock_restored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  option_name text not null,
  sku text not null,
  list_price integer not null,
  sale_price integer not null,
  quantity integer not null check (quantity > 0),
  line_coupon integer not null default 0,
  line_points integer not null default 0,
  snapshot jsonb
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  order_id uuid references public.orders (id) on delete set null,
  provider text not null,
  method text not null,
  status text not null check (
    status in ('ready', 'paid', 'failed', 'cancelled', 'partial_refunded', 'refunded')
  ),
  amount integer not null check (amount >= 0),
  transaction_id text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  carrier text,
  tracking_no text,
  status text not null default 'preparing' check (status in ('preparing', 'shipped', 'in_transit', 'delivered')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  type text not null check (type in ('cancel', 'return', 'refund')),
  status text not null default 'requested' check (
    status in ('requested', 'approved', 'collecting', 'received', 'refunded', 'rejected')
  ),
  reason text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  return_id uuid references public.returns (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  amount integer not null check (amount >= 0),
  points_restored integer not null default 0,
  points_clawed_back integer not null default 0,
  unrecoverable_points integer not null default 0,
  coupon_restored boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  note text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 2 and 2000),
  display_name text,
  is_hidden boolean not null default false,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  alt text
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  product_id uuid references public.products (id) on delete cascade,
  author_name text,
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 5000),
  is_secret boolean not null default false,
  is_pinned boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  author_name text,
  content text not null check (char_length(content) between 1 and 2000),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text,
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value integer not null check (discount_value >= 0),
  min_order_amount integer not null default 0 check (min_order_amount >= 0),
  max_discount_amount integer check (max_discount_amount is null or max_discount_amount >= 0),
  category_id uuid references public.categories (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  issue_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'used', 'expired', 'restored')),
  used_at timestamptz,
  order_id uuid references public.orders (id) on delete set null,
  issued_at timestamptz not null default now(),
  unique (user_id, coupon_id)
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  type text not null check (type in ('earn', 'use', 'restore', 'expire', 'adjust')),
  amount integer not null,
  balance_after integer not null,
  expires_at timestamptz,
  memo text,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjust')),
  quantity integer not null,
  reason text,
  ref_type text,
  ref_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text not null unique,
  status text not null default 'draft' check (status in ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  supplier text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  received_quantity integer not null default 0 check (received_quantity >= 0),
  unit_cost integer check (unit_cost is null or unit_cost >= 0)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  product_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  banner_path text
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text,
  link_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_path text,
  link_url text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  doc_type text not null check (doc_type in ('cash_receipt', 'tax_invoice')),
  status text not null default 'requested' check (status in ('requested', 'issued', 'rejected')),
  provider text not null default 'mock',
  provider_ref text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index product_variants_product_idx on public.product_variants (product_id);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index point_ledger_user_idx on public.point_ledger (user_id, created_at, id);
create index reviews_product_idx on public.reviews (product_id, created_at desc);
create index posts_board_idx on public.posts (board_id, created_at desc);
create index inquiries_user_idx on public.inquiries (user_id, created_at desc);
create index payments_user_idx on public.payments (user_id, created_at desc);

create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts
for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders
for each row execute function public.set_updated_at();
create trigger shipments_updated before update on public.shipments
for each row execute function public.set_updated_at();
create trigger returns_updated before update on public.returns
for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts
for each row execute function public.set_updated_at();
create trigger inquiries_updated before update on public.inquiries
for each row execute function public.set_updated_at();
create trigger purchase_orders_updated before update on public.purchase_orders
for each row execute function public.set_updated_at();
create trigger reviews_updated before update on public.reviews
for each row execute function public.set_updated_at();
create trigger tax_documents_updated before update on public.tax_documents
for each row execute function public.set_updated_at();
