-- Pricing, points, checkout, and account functions.
-- Money math is integer-only and mirrors src/lib/pricing.ts.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.setting_int(p_key text, p_fallback integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::integer from public.shop_settings where key = p_key),
    p_fallback
  );
$$;

create or replace function public.alloc_weights(weights integer[], total integer)
returns integer[]
language plpgsql
immutable
as $$
declare
  n integer := coalesce(array_length(weights, 1), 0);
  shares integer[];
  sum_w integer := 0;
  used integer := 0;
  remainder integer;
  i integer;
  floor_share integer;
  cap integer;
  give integer;
begin
  if n = 0 then
    return array[]::integer[];
  end if;
  shares := array_fill(0, array[n]);
  if total <= 0 then
    return shares;
  end if;
  for i in 1..n loop
    sum_w := sum_w + coalesce(weights[i], 0);
  end loop;
  if sum_w <= 0 then
    return shares;
  end if;
  for i in 1..n loop
    if coalesce(weights[i], 0) > 0 then
      floor_share := (total * weights[i]) / sum_w;
      shares[i] := floor_share;
      used := used + floor_share;
    end if;
  end loop;
  remainder := total - used;
  for i in reverse n..1 loop
    exit when remainder <= 0;
    cap := coalesce(weights[i], 0) - shares[i];
    if cap > 0 then
      give := least(cap, remainder);
      shares[i] := shares[i] + give;
      remainder := remainder - give;
    end if;
  end loop;
  return shares;
end;
$$;

create or replace function public._replay_points(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rec record;
  lot record;
  need integer;
  take integer;
begin
  create temporary table if not exists _point_lots (
    seq serial primary key,
    remaining integer not null,
    expires_at timestamptz
  ) on commit drop;
  truncate _point_lots restart identity;

  for rec in
    select id, type, amount, expires_at, created_at
    from public.point_ledger
    where user_id = p_user
    order by created_at asc, id asc
  loop
    if rec.amount > 0 then
      insert into _point_lots (remaining, expires_at)
      values (rec.amount, rec.expires_at);
    elsif rec.amount < 0 then
      need := -rec.amount;
      if rec.type = 'expire' then
        for lot in
          select seq, remaining
          from _point_lots
          where remaining > 0
            and expires_at is not null
            and expires_at <= rec.created_at
          order by seq
        loop
          exit when need <= 0;
          take := least(lot.remaining, need);
          update _point_lots set remaining = remaining - take where seq = lot.seq;
          need := need - take;
        end loop;
      else
        for lot in
          select seq, remaining
          from _point_lots
          where remaining > 0
            and (expires_at is null or expires_at > rec.created_at)
          order by seq
        loop
          exit when need <= 0;
          take := least(lot.remaining, need);
          update _point_lots set remaining = remaining - take where seq = lot.seq;
          need := need - take;
        end loop;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.compute_point_balance(p_user uuid, p_now timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  bal integer;
begin
  if auth.uid() is distinct from p_user and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  perform public._replay_points(p_user);
  select coalesce(sum(remaining), 0) into bal
  from _point_lots
  where expires_at is null or expires_at > p_now;
  return bal;
end;
$$;

create or replace function public.expire_due_points(p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  expired_sum integer;
  bal integer;
begin
  if auth.uid() is distinct from p_user and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtext('points:' || p_user::text));
  perform public._replay_points(p_user);
  select coalesce(sum(remaining), 0) into expired_sum
  from _point_lots
  where expires_at is not null and expires_at <= now() and remaining > 0;
  select coalesce(sum(remaining), 0) into bal
  from _point_lots
  where expires_at is null or expires_at > now();
  if expired_sum > 0 then
    insert into public.point_ledger (user_id, type, amount, balance_after, memo)
    values (p_user, 'expire', -expired_sum, bal, '포인트 만료');
  end if;
end;
$$;

create or replace function public.refresh_my_points()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  perform public.expire_due_points(auth.uid());
  return public.compute_point_balance(auth.uid(), now());
end;
$$;

create or replace function public.calculate_checkout(
  p_user uuid,
  p_items jsonb,
  p_user_coupon_id uuid,
  p_points integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  item jsonb;
  elem record;
  vid uuid;
  qty integer;
  vrec record;
  errors text[] := '{}';
  line record;
  list_sub integer := 0;
  sale_sub integer := 0;
  eligible integer := 0;
  coupon_discount integer := 0;
  accepted_coupon integer := 0;
  after_coupon integer := 0;
  points_used integer := 0;
  merchandise integer := 0;
  shipping_fee integer := 0;
  total integer := 0;
  earned integer := 0;
  threshold integer;
  base_fee integer;
  min_use integer;
  crec record;
  weights integer[];
  ids uuid[];
  shares integer[];
  i integer;
  bal integer;
  coupon_valid boolean := false;
  now_at timestamptz := now();
begin
  if auth.uid() is distinct from p_user and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('주문할 상품이 없습니다.'), 'total', 0);
  end if;

  create temporary table if not exists _calc_lines (
    variant_id uuid primary key,
    product_id uuid,
    category_id uuid,
    product_name text,
    option_name text,
    sku text,
    list_price integer,
    sale_price integer,
    quantity integer,
    stock integer,
    point_rate_bps integer,
    product_status text,
    variant_active boolean,
    line_coupon integer default 0,
    line_points integer default 0
  ) on commit drop;
  truncate _calc_lines;

  for elem in select value from jsonb_array_elements(p_items) loop
    item := elem.value;
    begin
      vid := (item->>'variant_id')::uuid;
      qty := (item->>'quantity')::integer;
    exception when others then
      errors := array_append(errors, '상품 정보가 올바르지 않습니다.');
      continue;
    end;
    if qty is null or qty <= 0 then
      errors := array_append(errors, '수량은 1 이상이어야 합니다.');
      continue;
    end if;
    update _calc_lines set quantity = quantity + qty where variant_id = vid;
    if found then
      continue;
    end if;
    select
      v.id, v.product_id, v.sku, v.option_name, v.list_price, v.sale_price, v.stock, v.is_active,
      p.category_id, p.name, p.status, p.point_rate_bps
    into vrec
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = vid
    for update of v;
    if not found then
      errors := array_append(errors, '상품 옵션을 찾을 수 없습니다.');
      continue;
    end if;
    insert into _calc_lines (
      variant_id, product_id, category_id, product_name, option_name, sku,
      list_price, sale_price, quantity, stock, point_rate_bps, product_status, variant_active
    ) values (
      vrec.id, vrec.product_id, vrec.category_id, vrec.name, vrec.option_name, vrec.sku,
      vrec.list_price, vrec.sale_price, qty, vrec.stock, vrec.point_rate_bps, vrec.status, vrec.is_active
    );
  end loop;

  if not exists (select 1 from _calc_lines) then
    return jsonb_build_object('ok', false, 'errors', to_jsonb(errors), 'total', 0);
  end if;

  for line in select * from _calc_lines order by variant_id loop
    if line.sale_price < 0 or line.list_price < 0 then
      errors := array_append(errors, line.product_name || ' 가격 정보가 올바르지 않습니다.');
    end if;
    if not line.variant_active then
      errors := array_append(errors, line.product_name || ' 옵션은 판매 중이 아닙니다.');
    end if;
    if line.product_status <> 'on_sale' then
      errors := array_append(errors, line.product_name || ' 상품은 판매 중이 아닙니다.');
    end if;
    if line.quantity > line.stock then
      errors := array_append(errors, line.product_name || ' 재고가 부족합니다.');
    end if;
    list_sub := list_sub + (line.list_price * line.quantity);
    sale_sub := sale_sub + (line.sale_price * line.quantity);
  end loop;

  if p_user_coupon_id is not null then
    select uc.status, uc.user_id, c.discount_type, c.discount_value, c.min_order_amount,
           c.max_discount_amount, c.category_id, c.product_id, c.starts_at, c.ends_at,
           c.is_active, c.code, c.name
    into crec
    from public.user_coupons uc
    join public.coupons c on c.id = uc.coupon_id
    where uc.id = p_user_coupon_id
    for update of uc;

    if not found then
      errors := array_append(errors, '사용할 수 없는 쿠폰입니다.');
    elsif crec.user_id is distinct from p_user or crec.status <> 'available' or not crec.is_active then
      errors := array_append(errors, '사용할 수 없는 쿠폰입니다.');
    elsif crec.starts_at is not null and now_at < crec.starts_at then
      errors := array_append(errors, '아직 사용할 수 없는 쿠폰입니다.');
    elsif crec.ends_at is not null and now_at > crec.ends_at then
      errors := array_append(errors, '쿠폰 사용 기간이 지났습니다.');
    else
      select coalesce(sum(sale_price * quantity), 0) into eligible
      from _calc_lines
      where (crec.category_id is null or category_id = crec.category_id)
        and (crec.product_id is null or product_id = crec.product_id);
      if eligible <= 0 then
        errors := array_append(errors, '쿠폰 적용 대상 상품이 없습니다.');
      elsif eligible < crec.min_order_amount then
        errors := array_append(errors, '쿠폰은 ' || crec.min_order_amount::text || '원 이상 구매 시 사용할 수 있습니다.');
      else
        if crec.discount_type = 'percent' then
          coupon_discount := (eligible * crec.discount_value) / 100;
        else
          coupon_discount := crec.discount_value;
        end if;
        if crec.max_discount_amount is not null then
          coupon_discount := least(coupon_discount, crec.max_discount_amount);
        end if;
        coupon_discount := greatest(0, least(coupon_discount, eligible));
        select
          coalesce(array_agg(sale_price * quantity order by variant_id), array[]::integer[]),
          coalesce(array_agg(variant_id order by variant_id), array[]::uuid[])
        into weights, ids
        from _calc_lines
        where (crec.category_id is null or category_id = crec.category_id)
          and (crec.product_id is null or product_id = crec.product_id);
        shares := public.alloc_weights(weights, coupon_discount);
        if shares is not null then
          for i in 1..coalesce(array_length(ids, 1), 0) loop
            update _calc_lines set line_coupon = shares[i] where variant_id = ids[i];
          end loop;
        end if;
        coupon_valid := true;
      end if;
    end if;
  end if;

  select coalesce(sum(line_coupon), 0) into accepted_coupon from _calc_lines;
  after_coupon := sale_sub - accepted_coupon;
  min_use := public.setting_int('point_min_use', 1000);

  if p_points is null or p_points < 0 then
    errors := array_append(errors, '포인트 금액이 올바르지 않습니다.');
  elsif p_points > 0 then
    bal := public.compute_point_balance(p_user, now_at);
    if p_points < min_use then
      errors := array_append(errors, '포인트는 ' || min_use::text || 'P부터 사용할 수 있습니다.');
    elsif p_points > bal then
      errors := array_append(errors, '포인트 잔액이 부족합니다.');
    elsif p_points > after_coupon then
      errors := array_append(errors, '포인트는 쿠폰 적용 후 상품금액을 초과할 수 없습니다.');
    else
      points_used := p_points;
      select
        coalesce(array_agg((sale_price * quantity - line_coupon) order by variant_id), array[]::integer[]),
        coalesce(array_agg(variant_id order by variant_id), array[]::uuid[])
      into weights, ids
      from _calc_lines
      where sale_price * quantity - line_coupon > 0;
      shares := public.alloc_weights(weights, points_used);
      if shares is not null then
        for i in 1..coalesce(array_length(ids, 1), 0) loop
          update _calc_lines set line_points = shares[i] where variant_id = ids[i];
        end loop;
      end if;
    end if;
  end if;

  select coalesce(sum(((sale_price * quantity - line_coupon - line_points) * point_rate_bps) / 10000), 0)
  into earned
  from _calc_lines;

  merchandise := after_coupon - points_used;
  threshold := public.setting_int('free_shipping_threshold', 40000);
  base_fee := public.setting_int('base_shipping_fee', 3000);
  if merchandise >= threshold then
    shipping_fee := 0;
  else
    shipping_fee := base_fee;
  end if;
  total := merchandise + shipping_fee;

  return jsonb_build_object(
    'ok', coalesce(array_length(errors, 1), 0) = 0,
    'errors', to_jsonb(errors),
    'listSubtotal', list_sub,
    'saleSubtotal', sale_sub,
    'productDiscount', greatest(0, list_sub - sale_sub),
    'eligibleSubtotal', eligible,
    'couponDiscount', accepted_coupon,
    'pointsUsed', points_used,
    'shippingFee', shipping_fee,
    'total', total,
    'pointsEarned', earned,
    'couponValid', coupon_valid,
    'couponCode', case when coupon_valid then crec.code else null end,
    'couponName', case when coupon_valid then crec.name else null end,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variant_id', variant_id,
        'product_id', product_id,
        'product_name', product_name,
        'option_name', option_name,
        'sku', sku,
        'list_price', list_price,
        'sale_price', sale_price,
        'quantity', quantity,
        'line_coupon', line_coupon,
        'line_points', line_points,
        'point_rate_bps', point_rate_bps
      ) order by variant_id)
      from _calc_lines
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public._restore_order_benefits(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  bal integer;
  claw integer;
  expiry_days integer;
  restored_coupon boolean := false;
  uid uuid;
begin
  select * into ord from public.orders where id = p_order_id for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다.';
  end if;
  uid := ord.user_id;
  perform pg_advisory_xact_lock(hashtext('points:' || uid::text));

  if not ord.benefits_restored then
    perform public.expire_due_points(uid);
    bal := public.compute_point_balance(uid, now());
    expiry_days := public.setting_int('point_expiry_days', 365);
    if ord.points_used > 0 then
      bal := bal + ord.points_used;
      insert into public.point_ledger (user_id, order_id, type, amount, balance_after, expires_at, memo)
      values (
        uid, ord.id, 'restore', ord.points_used, bal,
        now() + make_interval(days => expiry_days),
        '주문 취소·환불 포인트 복원'
      );
    end if;
    claw := least(ord.points_earned, bal);
    if claw > 0 then
      bal := bal - claw;
      insert into public.point_ledger (user_id, order_id, type, amount, balance_after, memo)
      values (uid, ord.id, 'adjust', -claw, bal, '주문 취소·환불 적립 회수');
    end if;
    if ord.user_coupon_id is not null then
      update public.user_coupons
      set status = 'available', used_at = null, order_id = null
      where id = ord.user_coupon_id
        and user_id = uid
        and status = 'used'
        and order_id = ord.id;
      restored_coupon := found;
    end if;
    update public.orders
    set benefits_restored = true
    where id = ord.id;
  else
    claw := 0;
  end if;

  if not ord.stock_restored then
    update public.product_variants v
    set stock = v.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = ord.id
      and oi.variant_id = v.id;
    update public.products p
    set sales_count = greatest(0, p.sales_count - s.qty)
    from (
      select product_id, sum(quantity)::integer as qty
      from public.order_items
      where order_id = ord.id and product_id is not null
      group by product_id
    ) s
    where p.id = s.product_id;
    insert into public.inventory_movements (variant_id, type, quantity, reason, ref_type, ref_id, created_by)
    select oi.variant_id, 'in', oi.quantity, coalesce(p_reason, '주문 복원'), 'order', ord.id, auth.uid()
    from public.order_items oi
    where oi.order_id = ord.id
      and oi.variant_id is not null;
    update public.orders set stock_restored = true where id = ord.id;
  end if;

  update public.payments
  set status = 'refunded'
  where order_id = ord.id
    and status = 'paid';

  return jsonb_build_object(
    'points_restored', case when ord.benefits_restored then 0 else ord.points_used end,
    'points_clawed_back', coalesce(claw, 0),
    'unrecoverable_points', case when ord.benefits_restored then 0 else greatest(ord.points_earned - coalesce(claw, 0), 0) end,
    'coupon_restored', restored_coupon
  );
end;
$$;

create or replace function public.commit_order(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  addr jsonb := p -> 'address';
  result jsonb;
  line jsonb;
  elem record;
  ord_id uuid;
  ord_no text;
  attempts integer := 0;
  qty integer;
  vid uuid;
  allow_mock text;
  txn text;
  bal integer;
  expiry_days integer;
  points_used integer;
  earned integer;
  pay_id uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'active') then
    raise exception '주문할 수 없는 회원 상태입니다.';
  end if;
  allow_mock := coalesce((select value #>> '{}' from public.shop_settings where key = 'allow_mock_checkout'), 'true');
  if coalesce(p->>'payment_provider', 'mock') <> 'mock' or allow_mock <> 'true' then
    raise exception '지원하지 않는 결제 수단입니다.';
  end if;
  if coalesce(addr->>'recipient', '') = ''
     or coalesce(addr->>'phone', '') = ''
     or coalesce(addr->>'postal_code', '') = ''
     or coalesce(addr->>'address1', '') = '' then
    raise exception '배송지를 입력해 주세요.';
  end if;

  perform pg_advisory_xact_lock(hashtext('points:' || uid::text));
  result := public.calculate_checkout(
    uid,
    coalesce(p -> 'items', '[]'::jsonb),
    nullif(p->>'user_coupon_id', '')::uuid,
    coalesce((p->>'points_to_use')::integer, 0)
  );
  if coalesce((result->>'ok')::boolean, false) = false then
    raise exception '%', coalesce((select string_agg(value, ' ') from jsonb_array_elements_text(result -> 'errors')), '주문 검증에 실패했습니다.');
  end if;
  if (result->>'total')::integer is distinct from (p->>'expected_total')::integer then
    raise exception '결제 금액이 변경되었습니다. 다시 주문해 주세요.';
  end if;

  loop
    attempts := attempts + 1;
    ord_no := 'JS' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD')
      || lpad((floor(random() * 1000000))::integer::text, 6, '0');
    begin
      insert into public.orders (
        order_no, user_id, status, recipient, phone, postal_code, address1, address2, memo,
        list_subtotal, sale_subtotal, product_discount, coupon_discount, points_used,
        shipping_fee, total, points_earned, user_coupon_id, coupon_snapshot
      ) values (
        ord_no, uid, 'paid',
        addr->>'recipient', addr->>'phone', addr->>'postal_code', addr->>'address1', nullif(addr->>'address2', ''),
        nullif(addr->>'memo', ''),
        (result->>'listSubtotal')::integer,
        (result->>'saleSubtotal')::integer,
        (result->>'productDiscount')::integer,
        (result->>'couponDiscount')::integer,
        (result->>'pointsUsed')::integer,
        (result->>'shippingFee')::integer,
        (result->>'total')::integer,
        (result->>'pointsEarned')::integer,
        case when coalesce((result->>'couponValid')::boolean, false)
          then nullif(p->>'user_coupon_id', '')::uuid else null end,
        case when coalesce((result->>'couponValid')::boolean, false) then jsonb_build_object(
          'code', result->>'couponCode',
          'name', result->>'couponName',
          'discount', (result->>'couponDiscount')::integer
        ) else null end
      ) returning id into ord_id;
      exit;
    exception when unique_violation then
      if attempts >= 5 then
        raise;
      end if;
    end;
  end loop;

  for elem in select value from jsonb_array_elements(result -> 'lines') loop
    line := elem.value;
    vid := (line->>'variant_id')::uuid;
    qty := (line->>'quantity')::integer;
    update public.product_variants
    set stock = stock - qty
    where id = vid and stock >= qty;
    if not found then
      raise exception '재고가 부족합니다.';
    end if;
    update public.products
    set sales_count = sales_count + qty
    where id = (line->>'product_id')::uuid;
    insert into public.order_items (
      order_id, variant_id, product_id, product_name, option_name, sku,
      list_price, sale_price, quantity, line_coupon, line_points, snapshot
    ) values (
      ord_id, vid, (line->>'product_id')::uuid,
      line->>'product_name', line->>'option_name', line->>'sku',
      (line->>'list_price')::integer, (line->>'sale_price')::integer, qty,
      (line->>'line_coupon')::integer, (line->>'line_points')::integer, line
    );
    insert into public.inventory_movements (variant_id, type, quantity, reason, ref_type, ref_id, created_by)
    values (vid, 'out', -qty, '주문 출고', 'order', ord_id, uid);
  end loop;

  if coalesce((result->>'couponValid')::boolean, false) then
    update public.user_coupons
    set status = 'used', used_at = now(), order_id = ord_id
    where id = nullif(p->>'user_coupon_id', '')::uuid
      and user_id = uid
      and status = 'available';
    if not found then
      raise exception '쿠폰을 사용할 수 없습니다.';
    end if;
  end if;

  perform public.expire_due_points(uid);
  bal := public.compute_point_balance(uid, now());
  points_used := (result->>'pointsUsed')::integer;
  earned := (result->>'pointsEarned')::integer;
  expiry_days := public.setting_int('point_expiry_days', 365);
  if points_used > 0 then
    if points_used > bal then
      raise exception '포인트 잔액이 부족합니다.';
    end if;
    bal := bal - points_used;
    insert into public.point_ledger (user_id, order_id, type, amount, balance_after, memo)
    values (uid, ord_id, 'use', -points_used, bal, '주문 사용 ' || ord_no);
  end if;
  if earned > 0 then
    bal := bal + earned;
    insert into public.point_ledger (user_id, order_id, type, amount, balance_after, expires_at, memo)
    values (
      uid, ord_id, 'earn', earned, bal,
      now() + make_interval(days => expiry_days),
      '구매 적립 ' || ord_no
    );
  end if;

  txn := coalesce(nullif(p->>'transaction_id', ''), 'mock_' || ord_no);
  insert into public.payments (user_id, order_id, provider, method, status, amount, transaction_id, raw)
  values (
    uid, ord_id, 'mock', coalesce(p->>'payment_method', 'mock_card'), 'paid',
    (result->>'total')::integer, txn,
    jsonb_build_object('provider', 'mock', 'sandbox', true)
  ) returning id into pay_id;

  insert into public.shipments (order_id, status) values (ord_id, 'preparing');
  insert into public.admin_audit_logs (admin_id, action, entity, entity_id, detail)
  values (uid, 'order.commit', 'orders', ord_id::text, jsonb_build_object('order_no', ord_no, 'total', result->'total'));

  return jsonb_build_object(
    'ok', true,
    'order_id', ord_id,
    'order_no', ord_no,
    'total', (result->>'total')::integer,
    'payment_id', pay_id
  );
end;
$$;

create or replace function public.log_failed_payment(p_method text, p_amount integer, p_message text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  insert into public.payments (user_id, provider, method, status, amount, raw)
  values (uid, 'mock', coalesce(p_method, 'mock_card'), 'failed', greatest(coalesce(p_amount, 0), 0),
          jsonb_build_object('message', p_message))
  returning id into pid;
  return pid;
end;
$$;

create or replace function public.request_order_cancel(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  effect jsonb;
  ret_id uuid;
  pay_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select * into ord from public.orders where id = p_order_id for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다.';
  end if;
  if ord.user_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if ord.status = 'cancelled' then
    raise exception '이미 취소된 주문입니다.';
  end if;
  if ord.user_id = auth.uid() and not public.is_admin() and ord.status not in ('payment_pending', 'paid', 'preparing') then
    raise exception '배송이 시작된 주문은 취소할 수 없습니다. 반품을 요청해 주세요.';
  end if;
  if public.is_admin() and ord.status not in ('payment_pending', 'paid', 'preparing', 'shipping') then
    raise exception '이 주문 상태에서는 취소할 수 없습니다.';
  end if;

  effect := public._restore_order_benefits(p_order_id, '주문 취소');
  update public.orders
  set status = 'cancelled', memo = coalesce(memo, ''), admin_memo = case when public.is_admin() and ord.user_id is distinct from auth.uid() then coalesce(p_reason, admin_memo) else admin_memo end
  where id = p_order_id;
  select id into pay_id from public.payments where order_id = p_order_id order by created_at desc limit 1;
  insert into public.returns (order_id, user_id, type, status, reason)
  values (p_order_id, ord.user_id, 'cancel', 'refunded', nullif(p_reason, ''))
  returning id into ret_id;
  insert into public.refunds (
    order_id, return_id, payment_id, amount, points_restored, points_clawed_back,
    unrecoverable_points, coupon_restored, status, note
  ) values (
    p_order_id, ret_id, pay_id, ord.total,
    coalesce((effect->>'points_restored')::integer, 0),
    coalesce((effect->>'points_clawed_back')::integer, 0),
    coalesce((effect->>'unrecoverable_points')::integer, 0),
    coalesce((effect->>'coupon_restored')::boolean, false),
    'completed',
    nullif(p_reason, '')
  );
  insert into public.admin_audit_logs (admin_id, action, entity, entity_id, detail)
  values (auth.uid(), 'order.cancel', 'orders', p_order_id::text, effect);
  return effect || jsonb_build_object('return_id', ret_id);
end;
$$;

create or replace function public.request_return(p_order_id uuid, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  ret_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select * into ord from public.orders where id = p_order_id;
  if not found or ord.user_id is distinct from auth.uid() then
    raise exception '주문을 찾을 수 없습니다.';
  end if;
  if ord.status not in ('shipping', 'delivered', 'confirmed') then
    raise exception '반품을 요청할 수 있는 상태가 아닙니다.';
  end if;
  if exists (
    select 1 from public.returns
    where order_id = p_order_id and type = 'return' and status <> 'rejected'
  ) then
    raise exception '이미 진행 중인 반품이 있습니다.';
  end if;
  if coalesce(p_reason, '') = '' then
    raise exception '반품 사유를 입력해 주세요.';
  end if;
  insert into public.returns (order_id, user_id, type, status, reason)
  values (p_order_id, auth.uid(), 'return', 'requested', p_reason)
  returning id into ret_id;
  return ret_id;
end;
$$;

create or replace function public.confirm_purchase(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
begin
  select * into ord from public.orders where id = p_order_id for update;
  if not found or (ord.user_id is distinct from auth.uid() and not public.is_admin()) then
    raise exception '주문을 찾을 수 없습니다.';
  end if;
  if ord.status <> 'delivered' then
    raise exception '배송 완료 후 구매를 확정할 수 있습니다.';
  end if;
  update public.orders set status = 'confirmed' where id = p_order_id;
end;
$$;

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status text,
  p_carrier text default null,
  p_tracking text default null,
  p_memo text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into ord from public.orders where id = p_order_id for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다.';
  end if;
  if p_status = 'cancelled' then
    perform public.request_order_cancel(p_order_id, coalesce(p_memo, '관리자 취소'));
    return;
  end if;
  if p_status not in ('paid', 'preparing', 'shipping', 'delivered', 'confirmed') then
    raise exception '변경할 수 없는 상태입니다.';
  end if;
  if ord.status = 'cancelled' then
    raise exception '취소된 주문의 상태는 되돌릴 수 없습니다.';
  end if;
  update public.orders
  set status = p_status,
      admin_memo = coalesce(nullif(p_memo, ''), admin_memo)
  where id = p_order_id;
  update public.shipments
  set carrier = coalesce(nullif(p_carrier, ''), carrier),
      tracking_no = coalesce(nullif(p_tracking, ''), tracking_no),
      status = case p_status
        when 'shipping' then 'in_transit'
        when 'delivered' then 'delivered'
        when 'confirmed' then 'delivered'
        else status
      end,
      shipped_at = case when p_status = 'shipping' then coalesce(shipped_at, now()) else shipped_at end,
      delivered_at = case when p_status in ('delivered', 'confirmed') then coalesce(delivered_at, now()) else delivered_at end
  where order_id = p_order_id;
  insert into public.admin_audit_logs (admin_id, action, entity, entity_id, detail)
  values (auth.uid(), 'order.status', 'orders', p_order_id::text, jsonb_build_object('status', p_status, 'tracking', p_tracking));
end;
$$;

create or replace function public.admin_resolve_return(p_return_id uuid, p_status text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ret public.returns%rowtype;
  ord public.orders%rowtype;
  effect jsonb;
  pay_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('requested', 'approved', 'collecting', 'received', 'refunded', 'rejected') then
    raise exception '처리할 수 없는 반품 상태입니다.';
  end if;
  select * into ret from public.returns where id = p_return_id for update;
  if not found then
    raise exception '반품 요청을 찾을 수 없습니다.';
  end if;
  update public.returns
  set status = p_status, admin_note = nullif(p_note, '')
  where id = p_return_id;
  if p_status = 'refunded' and ret.type = 'return' and ret.status <> 'refunded' then
    select * into ord from public.orders where id = ret.order_id;
    effect := public._restore_order_benefits(ret.order_id, '반품 환불');
    select id into pay_id from public.payments where order_id = ret.order_id and status in ('paid', 'refunded') order by created_at desc limit 1;
    insert into public.refunds (
      order_id, return_id, payment_id, amount, points_restored, points_clawed_back,
      unrecoverable_points, coupon_restored, status, note
    ) values (
      ret.order_id, ret.id, pay_id, ord.total,
      coalesce((effect->>'points_restored')::integer, 0),
      coalesce((effect->>'points_clawed_back')::integer, 0),
      coalesce((effect->>'unrecoverable_points')::integer, 0),
      coalesce((effect->>'coupon_restored')::boolean, false),
      'completed',
      nullif(p_note, '')
    );
  end if;
  insert into public.admin_audit_logs (admin_id, action, entity, entity_id, detail)
  values (auth.uid(), 'return.resolve', 'returns', p_return_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.claim_coupon(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c public.coupons%rowtype;
  issued integer;
  new_id uuid;
begin
  if uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) and is_active;
  if not found then
    raise exception '쿠폰 코드를 확인해 주세요.';
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    raise exception '아직 발급할 수 없는 쿠폰입니다.';
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    raise exception '발급 기간이 끝난 쿠폰입니다.';
  end if;
  if exists (select 1 from public.user_coupons where user_id = uid and coupon_id = c.id) then
    raise exception '이미 발급된 쿠폰입니다.';
  end if;
  if c.issue_limit is not null then
    select count(*) into issued from public.user_coupons where coupon_id = c.id;
    if issued >= c.issue_limit then
      raise exception '쿠폰이 모두 소진되었습니다.';
    end if;
  end if;
  insert into public.user_coupons (user_id, coupon_id)
  values (uid, c.id)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_issue_coupon(p_email text, p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target uuid;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select id into target from public.profiles where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception '회원을 찾을 수 없습니다.';
  end if;
  -- claim_coupon checks auth.uid(), so issue directly.
  insert into public.user_coupons (user_id, coupon_id)
  select target, c.id
  from public.coupons c
  where upper(c.code) = upper(trim(p_code))
  on conflict (user_id, coupon_id) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception '쿠폰을 발급할 수 없습니다. 코드 또는 기존 발급을 확인해 주세요.';
  end if;
  return new_id;
end;
$$;

create or replace function public.find_login_id(p_name text, p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
  local_part text;
  domain text;
  digits text;
begin
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if coalesce(trim(p_name), '') = '' or length(digits) < 8 then
    return null;
  end if;
  select email into em
  from public.profiles
  where name = trim(p_name)
    and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = digits
    and status <> 'withdrawn'
    and email is not null
  limit 1;
  if em is null or position('@' in em) = 0 then
    return null;
  end if;
  local_part := split_part(em, '@', 1);
  domain := split_part(em, '@', 2);
  if char_length(local_part) <= 2 then
    local_part := substring(local_part from 1 for 1) || '***';
  else
    local_part := substring(local_part from 1 for 2) || '***';
  end if;
  return local_part || '@' || domain;
end;
$$;

create or replace function public.guard_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if current_setting('jobsaba.sync_email', true) = '1' then
    new.role := old.role;
    if new.status is distinct from old.status and new.status <> 'withdrawn' then
      new.status := old.status;
    end if;
    return new;
  end if;
  new.role := old.role;
  new.email := old.email;
  if new.status is distinct from old.status and new.status <> 'withdrawn' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
before update on public.profiles
for each row execute function public.guard_profile();

create or replace function public.guard_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.user_id := old.user_id;
  new.product_id := old.product_id;
  new.is_hidden := old.is_hidden;
  new.is_seed := old.is_seed;
  new.order_item_id := old.order_item_id;
  return new;
end;
$$;

create trigger reviews_guard
before update on public.reviews
for each row execute function public.guard_review();

create or replace function public.guard_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.is_admin := false;
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger comments_guard
before insert on public.comments
for each row execute function public.guard_comment();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  expiry_days integer;
begin
  insert into public.profiles (id, email, name, phone, marketing_agreed, terms_agreed_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'marketing_agreed')::boolean, false),
    now()
  );
  select id into cid from public.coupons where code = 'WELCOME3000' and is_active;
  if cid is not null then
    insert into public.user_coupons (user_id, coupon_id)
    values (new.id, cid)
    on conflict do nothing;
  end if;
  expiry_days := public.setting_int('point_expiry_days', 365);
  insert into public.point_ledger (user_id, type, amount, balance_after, expires_at, memo)
  values (
    new.id, 'earn', 2000, 2000,
    now() + make_interval(days => expiry_days),
    '가입 축하 포인트'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('jobsaba.sync_email', '1', true);
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.handle_user_email_update();
