begin;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null check (char_length(trim(title)) between 2 and 120),
  category text not null check (category in (
    'Calculators', 'Drafting tools', 'Lab items',
    'Books and modules', 'Uniform and attire', 'Other'
  )),
  description text not null default '' check (char_length(description) <= 3000),
  condition_note text not null check (char_length(trim(condition_note)) between 2 and 1000),
  listing_type text not null check (listing_type in ('free', 'rent')),
  price_label text check (char_length(price_label) <= 120),
  max_borrow_days integer not null check (max_borrow_days > 0),
  meetup_note text not null default '' check (char_length(meetup_note) <= 500),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_label_required check (
    listing_type <> 'rent' or coalesce(char_length(trim(price_label)), 0) > 0
  )
);

create index items_shelf_order on public.items(created_at desc, id desc)
where is_active and deleted_at is null;
create index items_owner on public.items(owner_id);

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null unique,
  position integer not null check (position between 1 and 3),
  unique (item_id, position)
);

alter table public.items enable row level security;
alter table public.item_photos enable row level security;
revoke all on public.items, public.item_photos from anon, authenticated;
grant select on public.items, public.item_photos to anon, authenticated;

commit;
