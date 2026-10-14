begin;

create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions, pg_catalog;

alter table public.items add constraint items_id_owner_unique unique (id, owner_id);
create sequence public.request_reference_counter;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  reference_number bigint not null unique default nextval('public.request_reference_counter'),
  reference text generated always as (
    'BH-' || lpad(reference_number::text, greatest(4, length(reference_number::text)), '0')
  ) stored,
  item_id uuid not null,
  owner_id uuid not null references public.profiles(id),
  borrower_id uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  message text not null default '' check (char_length(message) <= 1500),
  status text not null default 'requested' check (status in (
    'requested', 'approved', 'handed_over', 'returned', 'declined', 'cancelled'
  )),
  decline_reason text check (char_length(decline_reason) between 1 and 1000),
  decline_note text not null default '' check (char_length(decline_note) <= 1000),
  cancel_reason text not null default '' check (char_length(cancel_reason) <= 1000),
  approved_at timestamptz,
  declined_at timestamptz,
  handed_over_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  handover_notes text check (char_length(trim(handover_notes)) between 1 and 1500),
  handover_photo_path text unique,
  return_condition text check (return_condition in ('good', 'minor_wear', 'damaged')),
  return_notes text not null default '' check (char_length(return_notes) <= 1500),
  return_photo_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (item_id, owner_id) references public.items(id, owner_id),
  check (owner_id <> borrower_id),
  check (isfinite(start_date) and isfinite(end_date) and start_date <= end_date),
  check (status <> 'declined' or (decline_reason is not null and declined_at is not null)),
  check (status not in ('handed_over', 'returned') or (
    handed_over_at is not null and handover_notes is not null
  )),
  check (status <> 'returned' or (returned_at is not null and return_condition is not null)),
  check (status <> 'cancelled' or cancelled_at is not null),
  constraint requests_no_overlap exclude using gist (
    item_id with =, daterange(start_date, end_date, '[]') with &&
  ) where (status in ('approved', 'handed_over'))
);

comment on constraint requests_no_overlap on public.requests is
  'Inclusive approved/handed-over dates cannot overlap for one item, including concurrent approvals. Requested dates do not reserve an item.';

create index requests_borrower_order on public.requests(borrower_id, created_at desc, id desc);
create index requests_owner_order on public.requests(owner_id, created_at desc, id desc);
create index requests_item_active on public.requests(item_id)
where status in ('requested', 'approved', 'handed_over');

alter table public.requests enable row level security;
revoke all on public.requests from public, anon, authenticated;
revoke all on sequence public.request_reference_counter from public, anon, authenticated;
grant select on public.requests to authenticated;

create policy requests_read_participant on public.requests
for select to authenticated
using (
  (owner_id = (select auth.uid()) or borrower_id = (select auth.uid()))
  and (select public.is_verified())
);
comment on policy requests_read_participant on public.requests is
  'Only verified owner/borrower reads a request. Admin status alone gives no request access; browser writes use checked functions only.';

commit;
