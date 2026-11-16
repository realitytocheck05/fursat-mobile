-- Atomic, idempotent order creation. Called only by the server (service role) after packages/core buildOrder()
-- has re-priced every line from the database. Retries with the same client_order_id return the same order.
create or replace function public.create_order(
  p_tenant text,
  p_session uuid,
  p_guest uuid,
  p_client_order_id uuid,
  p_totals jsonb,      -- { subtotal, cgst, sgst, igst, total } in paise
  p_has_bar boolean,
  p_lines jsonb        -- [{ itemId, name, unitPaise, qty, note }]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from orders where tenant = p_tenant and client_order_id = p_client_order_id;
  if v_id is not null then return v_id; end if;

  if not exists (select 1 from table_sessions where id = p_session and tenant = p_tenant and closed_at is null) then
    raise exception 'SESSION_CLOSED';
  end if;
  if not exists (select 1 from session_guests where session_id = p_session and user_id = p_guest) then
    raise exception 'NOT_IN_SESSION';
  end if;

  insert into orders (tenant, session_id, guest_user_id, client_order_id, subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_paise, has_bar)
  values (p_tenant, p_session, p_guest, p_client_order_id,
          (p_totals->>'subtotal')::int, (p_totals->>'cgst')::int, (p_totals->>'sgst')::int, (p_totals->>'igst')::int, (p_totals->>'total')::int, p_has_bar)
  returning id into v_id;

  insert into order_items (order_id, item_id, name_snapshot, price_snapshot, qty, note)
  select v_id, l->>'itemId', l->>'name', (l->>'unitPaise')::int, (l->>'qty')::int, nullif(l->>'note', '')
  from jsonb_array_elements(p_lines) l;

  insert into audit_log (tenant, actor, action, detail) values (p_tenant, p_guest, 'order.created', jsonb_build_object('order', v_id, 'total', p_totals->'total'));
  return v_id;
end $$;

revoke all on function public.create_order(text, uuid, uuid, uuid, jsonb, boolean, jsonb) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.create_order(text, uuid, uuid, uuid, jsonb, boolean, jsonb) from anon, authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.create_order(text, uuid, uuid, uuid, jsonb, boolean, jsonb) to service_role';
  end if;
end $$;
