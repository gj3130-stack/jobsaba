-- RLS (PRD section 9) and API grants.

create or replace function public.guard_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.user_id := old.user_id;
  new.board_id := old.board_id;
  new.product_id := old.product_id;
  new.is_pinned := old.is_pinned;
  new.status := old.status;
  return new;
end;
$$;

create trigger posts_guard
before update on public.posts
for each row execute function public.guard_post();

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.returns enable row level security;
alter table public.refunds enable row level security;
alter table public.reviews enable row level security;
alter table public.review_images enable row level security;
alter table public.boards enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.inquiries enable row level security;
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;
alter table public.point_ledger enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.events enable row level security;
alter table public.banners enable row level security;
alter table public.popups enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.tax_documents enable row level security;
alter table public.shop_settings enable row level security;

create policy profiles_select on public.profiles
for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles
for insert with check (public.is_admin());

create policy addresses_all on public.addresses
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy categories_read on public.categories
for select using (is_active or public.is_admin());
create policy categories_admin on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products
for select using (status in ('on_sale', 'sold_out') or public.is_admin());
create policy products_admin on public.products
for all using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants
for select using (
  public.is_admin() or exists (
    select 1 from public.products p
    where p.id = product_id and p.status in ('on_sale', 'sold_out')
  )
);
create policy variants_admin on public.product_variants
for all using (public.is_admin()) with check (public.is_admin());

create policy images_read on public.product_images
for select using (
  public.is_admin() or exists (
    select 1 from public.products p
    where p.id = product_id and p.status in ('on_sale', 'sold_out')
  )
);
create policy images_admin on public.product_images
for all using (public.is_admin()) with check (public.is_admin());

create policy carts_own on public.carts
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy cart_items_own on public.cart_items
for all using (
  public.is_admin() or exists (
    select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or exists (
    select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()
  )
);

create policy wishlists_own on public.wishlists
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy orders_read on public.orders
for select using (user_id = auth.uid() or public.is_admin());
create policy orders_admin on public.orders
for all using (public.is_admin()) with check (public.is_admin());

create policy order_items_read on public.order_items
for select using (
  public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy order_items_admin on public.order_items
for all using (public.is_admin()) with check (public.is_admin());

create policy payments_read on public.payments
for select using (user_id = auth.uid() or public.is_admin());
create policy payments_admin on public.payments
for all using (public.is_admin()) with check (public.is_admin());

create policy shipments_read on public.shipments
for select using (
  public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy shipments_admin on public.shipments
for all using (public.is_admin()) with check (public.is_admin());

create policy returns_read on public.returns
for select using (user_id = auth.uid() or public.is_admin());
create policy returns_admin on public.returns
for all using (public.is_admin()) with check (public.is_admin());

create policy refunds_read on public.refunds
for select using (
  public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
  )
);
create policy refunds_admin on public.refunds
for all using (public.is_admin()) with check (public.is_admin());

create policy reviews_read on public.reviews
for select using (is_hidden = false or user_id = auth.uid() or public.is_admin());
create policy reviews_insert on public.reviews
for insert with check (
  user_id = auth.uid()
  and is_seed = false
  and is_hidden = false
  and exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = auth.uid()
      and oi.product_id = product_id
      and o.status in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed')
  )
);
create policy reviews_update on public.reviews
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy reviews_delete on public.reviews
for delete using (user_id = auth.uid() or public.is_admin());

create policy review_images_read on public.review_images
for select using (
  exists (
    select 1 from public.reviews r
    where r.id = review_id
      and (r.is_hidden = false or r.user_id = auth.uid() or public.is_admin())
  )
);
create policy review_images_write on public.review_images
for all using (
  public.is_admin() or exists (
    select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or exists (
    select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()
  )
);

create policy boards_read on public.boards for select using (true);
create policy boards_admin on public.boards
for all using (public.is_admin()) with check (public.is_admin());

create policy posts_read on public.posts
for select using (
  status = 'published'
  and (is_secret = false or user_id = auth.uid() or public.is_admin())
);
create policy posts_insert on public.posts
for insert with check (user_id = auth.uid() and status = 'published' and is_pinned = false);
create policy posts_update on public.posts
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy posts_delete on public.posts
for delete using (user_id = auth.uid() or public.is_admin());
create policy posts_admin on public.posts
for all using (public.is_admin()) with check (public.is_admin());

create policy comments_read on public.comments
for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.status = 'published'
      and (p.is_secret = false or p.user_id = auth.uid() or public.is_admin())
  )
);
create policy comments_insert on public.comments
for insert with check (user_id = auth.uid() and is_admin = false);
create policy comments_delete on public.comments
for delete using (user_id = auth.uid() or public.is_admin());
create policy comments_admin on public.comments
for all using (public.is_admin()) with check (public.is_admin());

create policy inquiries_select on public.inquiries
for select using (user_id = auth.uid() or public.is_admin());
create policy inquiries_insert on public.inquiries
for insert with check (user_id = auth.uid());
create policy inquiries_admin on public.inquiries
for all using (public.is_admin()) with check (public.is_admin());

create policy coupons_read on public.coupons
for select using (is_active or public.is_admin());
create policy coupons_admin on public.coupons
for all using (public.is_admin()) with check (public.is_admin());

create policy user_coupons_read on public.user_coupons
for select using (user_id = auth.uid() or public.is_admin());
create policy user_coupons_admin on public.user_coupons
for all using (public.is_admin()) with check (public.is_admin());

create policy points_read on public.point_ledger
for select using (user_id = auth.uid() or public.is_admin());
create policy points_admin on public.point_ledger
for all using (public.is_admin()) with check (public.is_admin());

create policy inventory_admin on public.inventory_movements
for all using (public.is_admin()) with check (public.is_admin());
create policy po_admin on public.purchase_orders
for all using (public.is_admin()) with check (public.is_admin());
create policy po_items_admin on public.purchase_order_items
for all using (public.is_admin()) with check (public.is_admin());
create policy audit_admin on public.admin_audit_logs
for all using (public.is_admin()) with check (public.is_admin());

create policy events_read on public.events
for select using (
  public.is_admin() or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);
create policy events_admin on public.events
for all using (public.is_admin()) with check (public.is_admin());

create policy banners_read on public.banners
for select using (
  public.is_admin() or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);
create policy banners_admin on public.banners
for all using (public.is_admin()) with check (public.is_admin());

create policy popups_read on public.popups
for select using (
  public.is_admin() or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);
create policy popups_admin on public.popups
for all using (public.is_admin()) with check (public.is_admin());

create policy tax_select on public.tax_documents
for select using (user_id = auth.uid() or public.is_admin());
create policy tax_insert on public.tax_documents
for insert with check (user_id = auth.uid());
create policy tax_admin on public.tax_documents
for all using (public.is_admin()) with check (public.is_admin());

create policy settings_read on public.shop_settings for select using (true);
create policy settings_admin on public.shop_settings
for all using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

revoke all on function public.calculate_checkout(uuid, jsonb, uuid, integer) from public;
revoke all on function public._replay_points(uuid) from public;
revoke all on function public._restore_order_benefits(uuid, text) from public;
revoke all on function public.alloc_weights(integer[], integer) from public;
revoke all on function public.setting_int(text, integer) from public;
revoke all on function public.expire_due_points(uuid) from public;
revoke all on function public.commit_order(jsonb) from public;
revoke all on function public.log_failed_payment(text, integer, text) from public;
revoke all on function public.request_order_cancel(uuid, text) from public;
revoke all on function public.request_return(uuid, text) from public;
revoke all on function public.confirm_purchase(uuid) from public;
revoke all on function public.admin_set_order_status(uuid, text, text, text, text) from public;
revoke all on function public.admin_resolve_return(uuid, text, text) from public;
revoke all on function public.claim_coupon(text) from public;
revoke all on function public.admin_issue_coupon(text, text) from public;
revoke all on function public.find_login_id(text, text) from public;
revoke all on function public.refresh_my_points() from public;
revoke all on function public.compute_point_balance(uuid, timestamptz) from public;
revoke all on function public.is_admin() from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.find_login_id(text, text) to anon, authenticated;
grant execute on function public.commit_order(jsonb) to authenticated;
grant execute on function public.log_failed_payment(text, integer, text) to authenticated;
grant execute on function public.request_order_cancel(uuid, text) to authenticated;
grant execute on function public.request_return(uuid, text) to authenticated;
grant execute on function public.confirm_purchase(uuid) to authenticated;
grant execute on function public.admin_set_order_status(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_resolve_return(uuid, text, text) to authenticated;
grant execute on function public.claim_coupon(text) to authenticated;
grant execute on function public.admin_issue_coupon(text, text) to authenticated;
grant execute on function public.refresh_my_points() to authenticated;
grant execute on function public.compute_point_balance(uuid, timestamptz) to authenticated;
grant execute on all functions in schema public to service_role;
